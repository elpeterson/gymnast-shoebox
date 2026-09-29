// Shared Supabase queries for scorecard events.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventRow } from './stats';

export const EVENT_SELECT = `
  id, name, venue, start_date, end_date, shot_on, session, target, division,
  bow_style, environment, distance_m, face_cm, arrows_per_end, bonus_labels,
  source, source_path, name_on_card, created_at,
  rounds ( round_number, total, bonus, ends ( end_number, arrows ) )
`;

export type EventDetail = EventRow & {
  venue: string | null;
  end_date: string | null;
  session: string | null;
  target: string | null;
  division: string | null;
  bonus_labels: string[];
  source: string;
  source_path: string | null;
  name_on_card: string | null;
  created_at: string;
  rounds: (EventRow['rounds'][number] & { bonus: number[] })[];
};

/** Every event for one archer, newest first, with rounds and ends attached. */
export async function fetchArcherEvents(
  supabase: SupabaseClient,
  archerId: string,
): Promise<{ events: EventDetail[]; error: string | null }> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('archer_id', archerId)
    .order('shot_on', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return {
    events: (data ?? []) as unknown as EventDetail[],
    error: error?.message ?? null,
  };
}
