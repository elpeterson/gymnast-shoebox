'use server';

import * as cheerio from 'cheerio';
import { revalidatePath } from 'next/cache';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { createClient } from '@/lib/supabase/server';
import { parseMsoDateRange } from '@/lib/mso';

export type MsoMeetSummary = {
  id: string;
  name: string;
  dateStr: string;
  level: string;
  isImported: boolean;
};

type ParsedMsoMeet = {
  name: string;
  level: string | null;
  startDate: string | null;
  endDate: string | null;
  allAroundPlace: number | null;
  scores: { apparatus: string; value: number; place: number | null }[];
};

const MSO_ORIGIN = 'https://www.meetscoresonline.com';
const MSO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
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

function safeMeetUrl(meetId: string) {
  if (!/^\/results\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(meetId)) {
    throw new Error('Invalid MSO meet identifier.');
  }
  return new URL(meetId, MSO_ORIGIN).toString();
}

async function getLinkedGymnast() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Authentication required' as const };

  const gymnastId = await ensureActiveGymnast();
  if (!gymnastId) return { error: 'No gymnast profile selected.' as const };

  const { data: gymnast } = await supabase
    .from('gymnasts')
    .select('id, name, mso_id')
    .eq('id', gymnastId)
    .eq('user_id', user.id)
    .single();

  if (!gymnast?.mso_id) {
    return { error: 'Link an MSO Athlete ID to this gymnast first.' as const };
  }

  return { supabase, user, gymnast };
}

export async function fetchMsoMeets() {
  const linked = await getLinkedGymnast();
  if ('error' in linked) return { error: linked.error };
  const { supabase, gymnast } = linked;

  try {
    const response = await fetch(
      `${MSO_ORIGIN}/Athlete.MyScores/${encodeURIComponent(gymnast.mso_id)}`,
      { cache: 'no-store', headers: MSO_HEADERS }
    );
    if (!response.ok) return { error: `MSO returned status ${response.status}.` };

    const $ = cheerio.load(await response.text());
    const meets = new Map<string, Omit<MsoMeetSummary, 'isImported'>>();

    $('a[href^="/results/"]').each((_index, element) => {
      const link = $(element);
      const id = link.attr('href');
      const columns = link.closest('tr').find('td');
      if (!id || columns.length === 0) return;

      const name = $(columns[0]).text().trim() || link.text().trim();
      const level = $(columns[2]).text().trim();
      const dateStr = $(columns[4]).text().trim() || 'Date TBD';
      if (name && name !== level) meets.set(id, { id, name, level, dateStr });
    });

    if (meets.size === 0) {
      return { error: 'No meets were found for the linked MSO athlete.' };
    }

    const { data: existing } = await supabase
      .from('competitions')
      .select('name, mso_meet_id')
      .eq('gymnast_id', gymnast.id);
    const ids = new Set(existing?.map((meet) => meet.mso_meet_id).filter(Boolean));
    const legacyNames = new Set(
      existing?.filter((meet) => !meet.mso_meet_id).map((meet) => meet.name)
    );

    return {
      success: true,
      meets: Array.from(meets.values()).map((meet) => ({
        ...meet,
        isImported: ids.has(meet.id) || legacyNames.has(meet.name),
      })),
    };
  } catch (error) {
    console.error('MSO meet list failed:', error);
    return { error: 'MSO could not be reached or its page format changed.' };
  }
}

async function parseMeet(meet: MsoMeetSummary): Promise<ParsedMsoMeet> {
  const response = await fetch(safeMeetUrl(meet.id), {
    cache: 'no-store',
    headers: MSO_HEADERS,
  });
  if (!response.ok) throw new Error(`MSO returned status ${response.status}.`);

  const $ = cheerio.load(await response.text());
  const name = $('h1.event-title').text().trim() || meet.name;
  const rawDate = $('#MeetDetails h5 strong').first().text().trim() || meet.dateStr;
  const scores: ParsedMsoMeet['scores'] = [];
  let allAroundPlace: number | null = null;

  $('#athlete table tbody tr').each((_index, row) => {
    const eventLabel = $(row).find('th').text().trim();
    const value = Number.parseFloat($(row).find('span.score').text().trim());
    const place = Number.parseInt($(row).find('span.place').text().replace('T', ''), 10);

    if (eventLabel === 'AA') {
      if (!Number.isNaN(place)) allAroundPlace = place;
      return;
    }

    const apparatus = APPARATUS_MAP[eventLabel];
    if (apparatus && !Number.isNaN(value)) {
      scores.push({ apparatus, value, place: Number.isNaN(place) ? null : place });
    }
  });

  if (scores.length === 0) throw new Error('MSO returned no recognizable event scores.');
  const { startDate, endDate } = parseMsoDateRange(rawDate);
  return {
    name,
    level: meet.level || null,
    startDate,
    endDate,
    allAroundPlace,
    scores,
  };
}

export async function syncMsoMeet(meet: MsoMeetSummary) {
  const linked = await getLinkedGymnast();
  if ('error' in linked) return { error: linked.error };
  const { supabase, gymnast } = linked;

  try {
    const parsed = await parseMeet(meet);
    let { data: existing } = await supabase
      .from('competitions')
      .select('id, notes')
      .eq('gymnast_id', gymnast.id)
      .eq('mso_meet_id', meet.id)
      .maybeSingle();

    if (!existing) {
      const legacy = await supabase
        .from('competitions')
        .select('id, notes')
        .eq('gymnast_id', gymnast.id)
        .eq('name', parsed.name)
        .is('mso_meet_id', null)
        .maybeSingle();
      existing = legacy.data;
    }

    const { error } = await supabase.rpc('save_competition', {
      p_competition_id: existing?.id ?? null,
      p_gymnast_id: gymnast.id,
      p_name: parsed.name,
      p_level: parsed.level,
      p_start_date: parsed.startDate,
      p_end_date: parsed.endDate,
      p_all_around_place: parsed.allAroundPlace,
      p_notes: existing?.notes ?? null,
      p_mso_meet_id: meet.id,
      p_scores: parsed.scores.map((score) => ({
        ...score,
        start_value: null,
      })),
    });
    if (error) return { error: error.message };

    revalidatePath('/dashboard');
    revalidatePath('/import');
    return { success: true, updated: Boolean(existing) };
  } catch (error) {
    console.error('MSO sync failed:', error);
    return { error: error instanceof Error ? error.message : 'MSO sync failed.' };
  }
}
