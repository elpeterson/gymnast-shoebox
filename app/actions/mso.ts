'use server';

import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ensureActiveGymnast } from './gymnast';
import { parseScoreRow, parseMeetDates } from '@/lib/mso-parser';
import {
  msoQuery,
  parseGymnastMeets,
  parseMeetResult,
} from '@/lib/mso-api';

export type MsoMeetSummary = {
  id: string;
  name: string;
  dateStr: string;
  level: string;
  detailsUrl: string;
  isImported?: boolean;
  // Present when the summary came from the JSON API (enables the JSON import
  // path, which also carries division). Absent for scraped summaries.
  meetId?: string;
  division?: string | null;
};

type FetchMeetsResult =
  | { error: string; success?: undefined; meets?: undefined }
  | { success: true; meets: MsoMeetSummary[]; error?: undefined };

type ImportResult =
  | { error: string; success?: undefined; warning?: undefined }
  | { success: true; warning?: string; error?: undefined };

async function fetchMsoMeetsScrape(msoId: string): Promise<FetchMeetsResult> {
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

async function importMsoMeetScrape(meet: MsoMeetSummary): Promise<ImportResult> {
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

// ---------------------------------------------------------------------------
// JSON API path (preferred). Captures level + division, which the scrape drops.
// ---------------------------------------------------------------------------

async function activeGymnastContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const gymnastId = await ensureActiveGymnast();
  if (!user || !gymnastId) return null;
  const { data: gymnast } = await supabase
    .from('gymnasts')
    .select('discipline, mso_id')
    .eq('id', gymnastId)
    .single();
  return {
    supabase,
    user,
    gymnastId,
    discipline: gymnast?.discipline ?? 'MAG',
    msoId: gymnast?.mso_id as string | null | undefined,
  };
}

async function fetchMsoMeetsApi(msoId: string): Promise<FetchMeetsResult> {
  const ctx = await activeGymnastContext();
  if (!ctx) return { error: 'Authentication required' };

  // The JSON slot mapping is men's-artistic only; women's stays on the scrape.
  if (ctx.discipline === 'WAG') return fetchMsoMeetsScrape(msoId);

  const rows = await msoQuery('msoGymnast', 'lookup_gymnast', {
    LookupIndex: 1,
    p_gymnastid: msoId,
  });
  const history = parseGymnastMeets(rows);
  if (history.length === 0) {
    return { error: 'No meets found. Double check the Athlete ID.' };
  }

  const { data: existing } = await ctx.supabase
    .from('competitions')
    .select('name')
    .eq('gymnast_id', ctx.gymnastId);
  const existingNames = new Set(existing?.map((e) => e.name));

  const meets: MsoMeetSummary[] = history.map((m) => ({
    id: m.meetId,
    meetId: m.meetId,
    name: m.meetName,
    dateStr: m.monthYear ?? 'Date TBD',
    level: m.level ?? '',
    division: m.division,
    detailsUrl: `https://www.meetscoresonline.com/results/${m.meetId}`,
    isImported: existingNames.has(m.meetName),
  }));

  return { success: true, meets };
}

async function importMsoMeetApi(meet: MsoMeetSummary): Promise<ImportResult> {
  const ctx = await activeGymnastContext();
  if (!ctx) return { error: 'Authentication required' };
  if (!meet.meetId) return { error: 'Missing meet id' };
  if (!ctx.msoId) return { error: 'This gymnast has no MSO Athlete ID set' };

  const rows = await msoQuery('msoMeet', 'lookup_scores2', {
    LookupIndex: 1,
    p_meetid: meet.meetId,
  });
  // mso_id (the Athlete ID) is the JSON API's gymnastid — verified in the spike.
  const result = parseMeetResult(rows, ctx.msoId);
  if (!result) return { error: 'Gymnast not found in this meet' };

  const { data: comp, error: compError } = await ctx.supabase
    .from('competitions')
    .insert({
      user_id: ctx.user.id,
      gymnast_id: ctx.gymnastId,
      name: result.meetName || meet.name,
      level: result.level,
      division: result.division,
      all_around_place: result.allAroundPlace,
    })
    .select()
    .single();

  if (compError) return { error: compError.message };

  const scoreRows = result.scores.map((s) => ({
    competition_id: comp.id,
    apparatus: s.apparatus,
    value: s.value,
    place: s.place,
  }));

  if (scoreRows.length > 0) {
    const { error: scoresError } = await ctx.supabase
      .from('scores')
      .insert(scoreRows);
    if (scoresError) {
      return { error: 'Meet created but scores failed to save.' };
    }
  } else {
    return {
      success: true,
      warning: 'Meet created, but no scores were recorded for it yet.',
    };
  }

  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Public entry points: try the JSON API first (richer, more robust), and fall
 * back to the legacy HTML scrape on any failure so imports never hard-break.
 */
export async function fetchMsoMeets(msoId: string): Promise<FetchMeetsResult> {
  if (!msoId) return { error: 'No MSO ID provided' };
  try {
    const viaApi = await fetchMsoMeetsApi(msoId);
    if ('success' in viaApi) return viaApi;
    // API returned a handled error (e.g. no meets) — trust it, don't scrape.
    return viaApi;
  } catch {
    // Transport/shape failure — fall back to scraping.
    return fetchMsoMeetsScrape(msoId);
  }
}

export async function importMsoMeet(meet: MsoMeetSummary): Promise<ImportResult> {
  // Scraped summaries have no meetId; use the scrape importer for those.
  if (!meet.meetId) return importMsoMeetScrape(meet);
  try {
    const viaApi = await importMsoMeetApi(meet);
    if (viaApi && !('error' in viaApi)) return viaApi;
    return importMsoMeetScrape(meet);
  } catch {
    return importMsoMeetScrape(meet);
  }
}
