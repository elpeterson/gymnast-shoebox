import type { SupabaseClient } from '@supabase/supabase-js';

export type ScoreInsert = {
  apparatus: string;
  value: number | null;
  place: number | null;
  start_value?: number | null;
};

type InsertResult =
  | { error: 'competition' | 'scores'; competitionId?: undefined }
  | { error?: undefined; competitionId: string };

/**
 * Insert a competition and its scores as one unit. The Supabase client has no
 * transactions, so if the scores insert fails the competition is deleted again
 * (scores cascade) rather than left behind as an empty meet.
 */
export async function insertCompetitionWithScores(
  supabase: SupabaseClient,
  competition: Record<string, unknown>,
  scores: ScoreInsert[],
): Promise<InsertResult> {
  const { data: comp, error: compError } = await supabase
    .from('competitions')
    .insert(competition)
    .select('id')
    .single();

  if (compError || !comp) return { error: 'competition' };

  if (scores.length > 0) {
    const { error: scoresError } = await supabase
      .from('scores')
      .insert(scores.map((s) => ({ ...s, competition_id: comp.id })));

    if (scoresError) {
      await supabase.from('competitions').delete().eq('id', comp.id);
      return { error: 'scores' };
    }
  }

  return { competitionId: comp.id };
}
