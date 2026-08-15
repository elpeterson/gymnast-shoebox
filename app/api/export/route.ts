import { createClient } from '@/lib/supabase/server';

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Authentication required', { status: 401 });

  const [{ data: gymnasts, error: gymnastError }, { data: competitions, error: competitionError }] =
    await Promise.all([
      supabase
        .from('gymnasts')
        .select('id, name, gender, mso_id, created_at, updated_at')
        .eq('user_id', user.id)
        .order('created_at'),
      supabase
        .from('competitions')
        .select('id, gymnast_id, name, start_date, end_date, level, all_around_place, notes, mso_meet_id, created_at, updated_at')
        .eq('user_id', user.id)
        .order('start_date'),
    ]);

  if (gymnastError || competitionError) {
    return new Response('Unable to export data', { status: 500 });
  }

  const competitionIds = competitions?.map((competition) => competition.id) ?? [];
  const scoresResult = competitionIds.length
    ? await supabase
        .from('scores')
        .select('id, competition_id, apparatus, value, start_value, place, created_at, updated_at')
        .in('competition_id', competitionIds)
        .order('apparatus')
    : { data: [], error: null };

  if (scoresResult.error) return new Response('Unable to export scores', { status: 500 });

  const format = new URL(request.url).searchParams.get('format') ?? 'json';
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const gymnastById = new Map(gymnasts?.map((gymnast) => [gymnast.id, gymnast.name]));
    const header = [
      'Gymnast', 'Competition', 'Start Date', 'End Date', 'Level',
      'All-Around Place', 'Event', 'Score', 'Start Value', 'Event Place', 'Notes',
    ];
    const rows = (competitions ?? []).flatMap((competition) => {
      const meetScores = (scoresResult.data ?? []).filter(
        (score) => score.competition_id === competition.id
      );
      const rowsForMeet = meetScores.length ? meetScores : [null];
      return rowsForMeet.map((score) => [
        gymnastById.get(competition.gymnast_id),
        competition.name,
        competition.start_date,
        competition.end_date,
        competition.level,
        competition.all_around_place,
        score?.apparatus,
        score?.value,
        score?.start_value,
        score?.place,
        competition.notes,
      ].map(csvCell).join(','));
    });

    return new Response([header.map(csvCell).join(','), ...rows].join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="gymnast-shoebox-${stamp}.csv"`,
      },
    });
  }

  const scoresByCompetition = new Map<string, typeof scoresResult.data>();
  for (const score of scoresResult.data ?? []) {
    const current = scoresByCompetition.get(score.competition_id) ?? [];
    current.push(score);
    scoresByCompetition.set(score.competition_id, current);
  }

  const archive = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    gymnasts: (gymnasts ?? []).map((gymnast) => ({
      ...gymnast,
      competitions: (competitions ?? [])
        .filter((competition) => competition.gymnast_id === gymnast.id)
        .map((competition) => ({
          ...competition,
          scores: scoresByCompetition.get(competition.id) ?? [],
        })),
    })),
  };

  return Response.json(archive, {
    headers: {
      'Content-Disposition': `attachment; filename="gymnast-shoebox-${stamp}.json"`,
    },
  });
}
