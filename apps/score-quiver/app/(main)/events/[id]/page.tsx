import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { EVENT_SELECT, type EventDetail } from '@/lib/events';
import { computeEventStats, eventDate, setupLabel } from '@/lib/stats';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScorecardGrid } from '@/components/scorecard-grid';
import { ArrowDistribution } from '@/components/arrow-distribution';
import { EventActions } from '@/components/event-actions';

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', id)
    .single();
  if (!data) notFound();

  const event = data as unknown as EventDetail;
  const stats = computeEventStats(event);
  const rounds = [...event.rounds].sort((a, b) => a.round_number - b.round_number);

  let pdfUrl: string | null = null;
  if (event.source_path) {
    const { data: signed } = await supabase.storage
      .from('scorecards')
      .createSignedUrl(event.source_path, 60 * 10);
    pdfUrl = signed?.signedUrl ?? null;
  }

  const tiles = [
    { label: 'Score', value: `${stats.total}`, sub: `of ${stats.maxScore}` },
    { label: 'Arrow average', value: formatNumber(stats.arrowAverage), sub: `${stats.arrowCount} arrows` },
    { label: 'Hit rate', value: formatPercent(stats.hitRate), sub: `${stats.misses} misses` },
    { label: 'Golds', value: `${stats.tens + stats.nines}`, sub: `${stats.tens} tens · ${stats.nines} nines` },
    { label: 'End average', value: formatNumber(stats.endAverage, 1), sub: `best ${stats.bestEnd} · worst ${stats.worstEnd}` },
    { label: 'Consistency', value: `±${formatNumber(stats.endStdDev, 1)}`, sub: 'spread of end scores' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" /> Scorecards
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">{event.name}</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(eventDate(event))}
            {event.venue && ` · ${event.venue}`}
          </p>
          <p className="text-sm text-muted-foreground">
            {[event.division, event.target && `Target ${event.target}`, event.session]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="text-sm font-medium">{setupLabel(event)}</p>
        </div>
        <div className="flex gap-2">
          {pdfUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <FileText className="mr-2 h-4 w-4" /> Original PDF
              </a>
            </Button>
          )}
          <EventActions
            eventId={event.id}
            setup={{
              environment: (event.environment as 'indoor' | 'outdoor') ?? 'indoor',
              bow_style: event.bow_style,
              distance_m: event.distance_m != null ? Number(event.distance_m) : null,
              face_cm: event.face_cm,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="text-2xl font-bold tabular-nums">{t.value}</p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where the arrows landed</CardTitle>
        </CardHeader>
        <CardContent>
          <ArrowDistribution distribution={stats.distribution} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {rounds.map((round) => (
          <Card key={round.round_number}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Round {round.round_number}</CardTitle>
            </CardHeader>
            <CardContent>
              <ScorecardGrid round={round} bonusLabels={event.bonus_labels} />
            </CardContent>
          </Card>
        ))}
      </div>

      {event.name_on_card && (
        <p className="text-xs text-muted-foreground">
          Imported from Between Ends · card issued to {event.name_on_card}
        </p>
      )}
    </div>
  );
}
