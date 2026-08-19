'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAG_APPARATUS, WAG_APPARATUS, LEVEL_OPTIONS } from '@/lib/constants';
import {
  apparatusWithData,
  buildSeries,
  levelHasDivisions,
  listDivisions,
  listLevels,
  type CompetitionRow,
} from '@/lib/insights';
import { ConsistencyChart } from '@/components/consistency-chart';

interface ConsistencyInsightsProps {
  competitions: CompetitionRow[];
  discipline: string;
}

/** Show "Level 4" for a bare number, otherwise the raw value (e.g. imported). */
function levelLabel(value: string): string {
  return LEVEL_OPTIONS.includes(value) ? `Level ${value}` : value;
}

export function ConsistencyInsights({
  competitions,
  discipline,
}: ConsistencyInsightsProps) {
  const apparatusConfig = discipline === 'WAG' ? WAG_APPARATUS : MAG_APPARATUS;
  const apparatusIds = useMemo(
    () => apparatusConfig.map((a) => a.id),
    [apparatusConfig]
  );

  const levels = useMemo(() => listLevels(competitions), [competitions]);

  // Default to the most recent level (first, since listLevels sorts recent-first).
  const [level, setLevel] = useState(() => levels[0]?.value ?? '');

  const divisions = useMemo(
    () => (level ? listDivisions(competitions, level) : []),
    [competitions, level]
  );
  const showDivision = levelHasDivisions(divisions);

  // Division filter: null means "whole level" (used when the level has none).
  const [division, setDivision] = useState<string | null>(
    () => divisions[0]?.value ?? null
  );

  // When the level changes, reset the division to that level's most recent one.
  useEffect(() => {
    setDivision(showDivision ? divisions[0]?.value ?? null : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const rows = useMemo(
    () => buildSeries(competitions, level, showDivision ? division : null, apparatusIds),
    [competitions, level, division, showDivision, apparatusIds]
  );

  const drawn = useMemo(() => {
    const withData = new Set(apparatusWithData(rows, apparatusIds));
    return apparatusConfig.filter((a) => withData.has(a.id));
  }, [rows, apparatusConfig, apparatusIds]);

  if (levels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No scores yet</CardTitle>
          <CardDescription>
            Add or import a few scored competitions and your season trend will
            appear here, one line per apparatus.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Season scores</CardTitle>
          <CardDescription>
            One line per apparatus across the season. Levels and divisions are
            shown separately — their scores are not comparable.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Level</span>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {levelLabel(l.value)}
                    <span className="ml-1 text-muted-foreground">
                      ({l.count})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showDivision && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Division</span>
              <Select
                value={division ?? ''}
                onValueChange={setDivision}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.value}
                      <span className="ml-1 text-muted-foreground">
                        ({d.count})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {drawn.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No apparatus scores recorded for this selection yet.
          </p>
        ) : (
          <ConsistencyChart data={rows} apparatus={drawn} />
        )}
      </CardContent>
    </Card>
  );
}
