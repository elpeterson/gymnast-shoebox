'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionActions } from '@/components/competition-actions';
import { MAG_APPARATUS, WAG_APPARATUS } from '@/lib/constants';

type ScoreItem = {
  apparatus: string;
  value: number | null;
  start_value?: number | null;
  place?: number | null;
};

type Competition = {
  id: string;
  gymnast_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  level?: string;
  all_around_score: number | null;
  all_around_place?: number | null;
  show_start_value: boolean;
  show_place: boolean;
  scores: ScoreItem[];
};

interface CompetitionListProps {
  competitions: Competition[];
  discipline: string;
}

export function CompetitionList({
  competitions,
  discipline,
}: CompetitionListProps) {
  const apparatusConfig = discipline === 'WAG' ? WAG_APPARATUS : MAG_APPARATUS;

  if (!competitions || competitions.length === 0) {
    return (
      <div className="text-center py-10">
        <Card>
          <CardHeader>
            <CardTitle>No competitions yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Get started by recording your first competition result.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {competitions.map((comp) => (
          <Card key={comp.id}>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-xl font-bold">{comp.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {!comp.start_date ? (
                    <span className="italic">Date TBD</span>
                  ) : (
                    <>
                      {new Date(comp.start_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {comp.end_date && comp.end_date !== comp.start_date && (
                        <>
                          {' '}
                          –{' '}
                          {new Date(comp.end_date).toLocaleDateString(
                            undefined,
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            },
                          )}
                        </>
                      )}
                    </>
                  )}
                  {comp.level && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/20">
                      {comp.level}
                    </span>
                  )}
                </p>
              </div>

              <div className="text-right flex flex-col items-end gap-2">
                <CompetitionActions id={comp.id} name={comp.name} />
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase">
                    All Around
                  </p>
                  <div className="flex items-baseline justify-end gap-2">
                    <p className="text-2xl font-bold text-primary">
                      {comp.all_around_score !== null
                        ? comp.all_around_score.toFixed(3)
                        : '0.000'}
                    </p>
                    {comp.show_place && comp.all_around_place && (
                      <span className="text-sm font-semibold text-muted-foreground">
                        ({comp.all_around_place})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
                {apparatusConfig.map((appConfig) => {
                  const score = comp.scores.find(
                    (s) => s.apparatus === appConfig.id,
                  );

                  return (
                    <div key={appConfig.id} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase truncate">
                        {appConfig.label}
                        {comp.show_place && score?.place && (
                          <span className="ml-1 text-[10px] text-muted-foreground/70">
                            ({score.place})
                          </span>
                        )}
                      </p>
                      <div className="flex items-baseline gap-2">
                        {comp.show_start_value && score?.start_value && (
                          <span
                            className="text-xs text-muted-foreground/60"
                            title="Start Value"
                          >
                            SV:{score.start_value.toFixed(1)}
                          </span>
                        )}
                        <p className="text-lg font-semibold">
                          {score?.value !== null && score?.value !== undefined
                            ? score.value.toFixed(3)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
