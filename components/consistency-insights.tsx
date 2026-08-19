'use client';

import { useMemo, useState } from 'react';
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
import { MAG_APPARATUS, WAG_APPARATUS } from '@/lib/constants';
import {
  apparatusWithData,
  buildDivisionSeries,
  listDivisions,
  type CompetitionRow,
} from '@/lib/insights';
import { ConsistencyChart } from '@/components/consistency-chart';

interface ConsistencyInsightsProps {
  competitions: CompetitionRow[];
  discipline: string;
}

export function ConsistencyInsights({
  competitions,
  discipline,
}: ConsistencyInsightsProps) {
  const apparatusConfig = discipline === 'WAG' ? WAG_APPARATUS : MAG_APPARATUS;

  const divisions = useMemo(
    () => listDivisions(competitions),
    [competitions]
  );

  // Default to the most recent division (first, since listDivisions sorts
  // most-recent first). Never an "all" option — divisions are not comparable.
  const [division, setDivision] = useState(
    () => divisions[0]?.division ?? ''
  );

  const rows = useMemo(
    () =>
      buildDivisionSeries(
        competitions,
        division,
        apparatusConfig.map((a) => a.id)
      ),
    [competitions, division, apparatusConfig]
  );

  const drawn = useMemo(() => {
    const withData = new Set(
      apparatusWithData(
        rows,
        apparatusConfig.map((a) => a.id)
      )
    );
    return apparatusConfig.filter((a) => withData.has(a.id));
  }, [rows, apparatusConfig]);

  if (divisions.length === 0) {
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
            One line per apparatus across the season. Divisions are shown
            separately — scores from different divisions are not comparable.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Division</span>
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Select division" />
            </SelectTrigger>
            <SelectContent>
              {divisions.map((d) => (
                <SelectItem key={d.division} value={d.division}>
                  {d.division}
                  <span className="ml-1 text-muted-foreground">
                    ({d.count})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {drawn.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No apparatus scores recorded for this division yet.
          </p>
        ) : (
          <ConsistencyChart data={rows} apparatus={drawn} />
        )}
      </CardContent>
    </Card>
  );
}
