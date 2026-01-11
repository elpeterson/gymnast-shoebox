'use server';

import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureActiveGymnast } from './gymnast';

export type MsoMeetSummary = {
  id: string;
  name: string;
  dateStr: string;
  level: string;
  detailsUrl: string;
  isImported?: boolean;
};

const APPARATUS_MAP: Record<string, string> = {
  Floor: 'floor_exercise',
  'Floor Exercise': 'floor_exercise',
  Pommel: 'pommel_horse',
  'Pommel Horse': 'pommel_horse',
  Rings: 'still_rings',
  'Still Rings': 'still_rings',
  Vault: 'vault',
  PBars: 'parallel_bars',
  'P Bars': 'parallel_bars',
  'Parallel Bars': 'parallel_bars',
  HiBar: 'high_bar',
  'High Bar': 'high_bar',
  'Horizontal Bar': 'high_bar',
  Beam: 'balance_beam',
  Bars: 'uneven_bars',
  'Uneven Bars': 'uneven_bars',
};

/**
 * STEP 1: Fetch the list of meets from the Athlete's Profile Page
 */
export async function fetchMsoMeets(msoId: string) {
  const supabase = await createClient();
  const activeGymnastId = await ensureActiveGymnast();

  if (!msoId) return { error: 'No MSO ID provided' };

  try {
    const response = await fetch(
      `https://www.meetscoresonline.com/Athlete.MyScores/${msoId}`,
      {
        cache: 'no-store',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      }
    );

    if (!response.ok)
      return { error: `Failed to reach MSO (Status: ${response.status})` };

    const html = await response.text();
    const $ = cheerio.load(html);
    const meets: MsoMeetSummary[] = [];

    // Parse Strategy: Look for the result links
    $('a[href^="/results/"]').each((i, el) => {
      const link = $(el);
      const href = link.attr('href');

      // Navigate up to the table row (tr) to find sibling data
      const row = link.closest('tr');
      if (row.length === 0) return;

      const cols = row.find('td');

      // CORRECTED MSO COLUMN MAPPING:
      // Col 0: Meet Name (Link is usually here)
      // Col 1: Club / Team
      // Col 2: Level
      // Col 3: Division
      // Col 4: Date (Sometimes this is missing/empty)

      // 1. Grab Meet Name (Col 0)
      // We prefer the text in the cell, fallback to link text
      let name = $(cols[0]).text().trim();
      if (!name) name = link.text().trim();

      // 2. Grab Level (Col 2)
      const level = $(cols[2]).text().trim();

      // 3. Grab Date (Col 4)
      // If the table doesn't have a 5th column, or it's empty, use TBD
      let dateStr = 'Date TBD';
      if (cols.length > 4) {
        const val = $(cols[4]).text().trim();
        if (val) dateStr = val;
      }

      // Filter out rows where Name is suspiciously identical to Level (parsing artifact)
      if (name === level && name.length < 5) return;

      if (name && href && !meets.find((m) => m.id === href)) {
        meets.push({
          id: href,
          name,
          dateStr,
          level,
          detailsUrl: `https://www.meetscoresonline.com${href}`,
        });
      }
    });

    if (meets.length === 0) {
      return { error: 'No meets found. Double check the Athlete ID.' };
    }

    const { data: existing } = await supabase
      .from('competitions')
      .select('name')
      .eq('gymnast_id', activeGymnastId);

    const existingNames = new Set(existing?.map((e) => e.name));

    const processedMeets = meets.map((m) => ({
      ...m,
      isImported: existingNames.has(m.name),
    }));

    return { success: true, meets: processedMeets };
  } catch (e) {
    console.error(e);
    return { error: 'Error parsing MSO data' };
  }
}

/**
 * STEP 2: Import a specific meet
 */
export async function importMsoMeet(meet: MsoMeetSummary) {
  const supabase = await createClient();
  const gymnastId = await ensureActiveGymnast();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !gymnastId) return { error: 'Authentication required' };

  try {
    const response = await fetch(meet.detailsUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    // --- 1. Scrape Meet Details (Source of Truth) ---
    // We scrape the name again from the detail page because the summary page
    // might truncate it or format it differently.
    let realName = $('h1.event-title').text().trim();
    if (!realName) realName = meet.name; // Fallback

    // Scrape the detailed date
    const realDateStr =
      $('#MeetDetails h5 strong').first().text().trim() || meet.dateStr;

    // --- 2. Scrape Scores ---
    const scoresToInsert: any[] = [];
    let allAroundPlace: number | null = null;

    // Target the specific table inside the athlete card
    $('#athlete table tbody tr').each((i, row) => {
      const $row = $(row);
      const eventLabel = $row.find('th').text().trim();
      const scoreText = $row.find('span.score').text().trim();
      const placeText = $row.find('span.place').text().trim();

      const value = parseFloat(scoreText);
      const place = parseInt(placeText.replace('T', '')); // Remove 'T' for ties

      if (eventLabel === 'AA') {
        if (!isNaN(place)) allAroundPlace = place;
      } else {
        const dbApparatus = APPARATUS_MAP[eventLabel];
        if (dbApparatus && !isNaN(value)) {
          scoresToInsert.push({
            apparatus: dbApparatus,
            value: value,
            place: isNaN(place) ? null : place,
          });
        }
      }
    });

    // --- 3. Date Parsing ---
    let startDate: string | null = null;
    let endDate: string | null = null;

    try {
      const cleanDateStr = realDateStr.replace(/\s+/g, ' ').trim();

      if (cleanDateStr.includes('-')) {
        const [start, end] = cleanDateStr.split('-').map((s) => s.trim());
        startDate = new Date(start).toISOString();
        endDate = new Date(end).toISOString();
      } else {
        startDate = new Date(cleanDateStr).toISOString();
        endDate = startDate;
      }
    } catch (e) {
      console.log('Date parsing skipped for:', realDateStr);
    }

    // --- 4. Database Insert ---
    const { data: comp, error: compError } = await supabase
      .from('competitions')
      .insert({
        user_id: user.id,
        gymnast_id: gymnastId,
        name: realName,
        level: meet.level,
        start_date: startDate,
        end_date: endDate,
        all_around_place: allAroundPlace,
      })
      .select()
      .single();

    if (compError) return { error: compError.message };

    const formattedScores = scoresToInsert.map((s) => ({
      competition_id: comp.id,
      apparatus: s.apparatus,
      value: s.value,
      place: s.place,
    }));

    if (formattedScores.length > 0) {
      await supabase.from('scores').insert(formattedScores);
    } else {
      return {
        success: true,
        warning: "Meet created, but score table format didn't match.",
      };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to import meet' };
  }
}
