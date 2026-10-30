import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ensureActiveArcher } from '@/app/actions/archer';
import { ScorecardImport, type SetupDefaults } from '@/components/scorecard-import';

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeArcherId = await ensureActiveArcher();
  if (!activeArcherId) redirect('/dashboard');

  const [{ data: archer }, { data: events }] = await Promise.all([
    supabase.from('archers').select('id, name').eq('id', activeArcherId).single(),
    supabase
      .from('events')
      .select('environment, bow_style, distance_m, face_cm, source_hash, shot_on')
      .eq('archer_id', activeArcherId)
      .order('shot_on', { ascending: false, nullsFirst: false }),
  ]);

  // Prefill distance/face from the most recent event with the same
  // indoor/outdoor + bow style, since the scorecard doesn't say.
  const setupDefaults: SetupDefaults = {};
  for (const e of events ?? []) {
    const key = `${e.environment}|${e.bow_style}`;
    if (!setupDefaults[key]) {
      setupDefaults[key] = {
        distance_m: e.distance_m != null ? Number(e.distance_m) : null,
        face_cm: e.face_cm,
      };
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Import scorecards</h2>
        <p className="text-muted-foreground mt-1">
          Add Between Ends scorecard PDFs for{' '}
          <span className="font-medium text-foreground">{archer?.name}</span>.
          They&apos;re read in your browser, checked end by end, and the
          original PDF is kept with the score.
        </p>
      </div>
      <ScorecardImport
        archer={archer!}
        userId={user.id}
        setupDefaults={setupDefaults}
        existingHashes={(events ?? [])
          .map((e) => e.source_hash)
          .filter((h): h is string => !!h)}
      />
    </div>
  );
}
