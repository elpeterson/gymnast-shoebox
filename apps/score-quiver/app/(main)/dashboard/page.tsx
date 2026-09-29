import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ensureActiveArcher } from '@/app/actions/archer';
import { FileUp, LineChart, Trophy } from 'lucide-react';
import { fetchArcherEvents } from '@/lib/events';
import {
  computeEventStats,
  eventDate,
  setupKey,
  setupLabel,
  trendForSetup,
} from '@/lib/stats';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const activeArcherId = await ensureActiveArcher();

  if (!activeArcherId) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-3">
        <h2 className="text-2xl font-bold">Welcome to Score Quiver</h2>
        <p className="text-muted-foreground">
          Start by adding an archer with the switcher in the header, then
          import their Between Ends scorecards.
        </p>
      </div>
    );
  }

  const { events, error } = await fetchArcherEvents(supabase, activeArcherId);

  if (error) {
    return <div className="p-8 text-red-500">Error loading scorecards.</div>;
  }

  // Personal bests are judged within a setup, at the time they were shot. A
  // setup's first-ever event is trivially a "best", so it needs company to count.
  const personalBests = new Set<string>();
  for (const key of new Set(events.map(setupKey))) {
    const trend = trendForSetup(events, key);
    if (trend.length < 2) continue;
    for (const p of trend) if (p.personalBest) personalBests.add(p.eventId);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold tracking-tight">Scorecards</h2>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/insights">
              <LineChart className="mr-2 h-4 w-4" />
              Insights
            </Link>
          </Button>
          <Button asChild>
            <Link href="/import">
              <FileUp className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-muted-foreground">No scorecards yet.</p>
            <p className="text-sm text-muted-foreground">
              In Between Ends, open a tournament&apos;s results and download the
              scorecard PDF, then drop it on the Import page.
            </p>
            <Button asChild>
              <Link href="/import">Import scorecards</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const s = computeEventStats(event);
            const pb = personalBests.has(event.id);
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{event.name}</h3>
                        {pb && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-2 py-0.5 text-[11px] font-medium text-foreground">
                            <Trophy className="h-3 w-3" /> PB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(eventDate(event))}
                        {event.division && ` · ${event.division}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {setupLabel(event)}
                      </p>
                    </div>
                    <div className="hidden sm:grid grid-cols-3 gap-5 text-right text-xs text-muted-foreground">
                      <div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {formatNumber(s.arrowAverage)}
                        </div>
                        avg arrow
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {formatPercent(s.hitRate)}
                        </div>
                        hits
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground tabular-nums">
                          {s.tens}
                        </div>
                        10s
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold tabular-nums">{s.total}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        / {s.maxScore}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
