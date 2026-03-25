'use server';

import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureActiveGymnast } from './gymnast';
import { parseScoreRow, parseMeetDates, APPARATUS_MAP } from '@/lib/mso-parser';

export type MsoMeetSummary = {
  id: string;
  name: string;
  dateStr: string;
  level: string;
  detailsUrl: string;
  isImported?: boolean;
};

export async function fetchMsoMeets(msoId: string) {
  const supabase = await createClient();
  const activeGymnastId = await ensureActiveGymnast();

  if (!msoId) return { error: 'No MSO ID provided' };

  try {
    const response = await fetch(
      `https://www.meetscoresonline.com/Athlete.MyScores/${msoId}`,
      {
        next: { revalidate: 300 }, // cache meet list for 5 minutes
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

    $('a[href^="/results/"]').each((i, el) => {
      const link = $(el);
      const href = link.attr('href');
      const row = link.closest('tr');
      if (row.length === 0) return;

      const cols = row.find('td');

      let name = $(cols[0]).text().trim();
      if (!name) name = link.text().trim();

      const level = $(cols[2]).text().trim();

      let dateStr = 'Date TBD';
      if (cols.length > 4) {
        const val = $(cols[4]).text().trim();
        if (val) dateStr = val;
      }

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
  } catch {
    return { error: 'Error parsing MSO data' };
  }
}

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

    let realName = $('h1.event-title').text().trim();
    if (!realName) realName = meet.name;

    const realDateStr =
      $('#MeetDetails h5 strong').first().text().trim() || meet.dateStr;

    const scoresToInsert: { apparatus: string; value: number; place: number | null }[] = [];
    let allAroundPlace: number | null = null;

    $('#athlete table tbody tr').each((i, row) => {
      const $row = $(row);
      const eventLabel = $row.find('th').text().trim();
      const scoreText = $row.find('span.score').text().trim();
      const placeText = $row.find('span.place').text().trim();

      if (eventLabel === 'AA') {
        const place = parseInt(placeText.replace('T', ''));
        if (!isNaN(place)) allAroundPlace = place;
      } else {
        const parsed = parseScoreRow(eventLabel, scoreText, placeText);
        if (parsed) scoresToInsert.push(parsed);
      }
    });

    const { startDate, endDate } = parseMeetDates(realDateStr);

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
      const { error: scoresError } = await supabase
        .from('scores')
        .insert(formattedScores);
      if (scoresError) return { error: 'Meet created but scores failed to save.' };
    } else {
      return {
        success: true,
        warning: "Meet created, but score table format didn't match.",
      };
    }

    revalidatePath('/dashboard');
    return { success: true };
  } catch {
    return { error: 'Failed to import meet' };
  }
}
