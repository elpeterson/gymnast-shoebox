'use client';

import { useEffect } from 'react';
import { Filter, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardTools({
  seasons,
  levels,
  selectedSeason,
  selectedLevel,
  shouldPrint,
}: {
  seasons: string[];
  levels: string[];
  selectedSeason: string;
  selectedLevel: string;
  shouldPrint: boolean;
}) {
  useEffect(() => {
    if (shouldPrint) window.print();
  }, [shouldPrint]);

  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-end sm:justify-between">
      <form className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-end">
        <div className="grid gap-1">
          <label htmlFor="season" className="text-xs font-medium text-muted-foreground">Season</label>
          <select
            id="season"
            name="season"
            defaultValue={selectedSeason}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All seasons</option>
            {seasons.map((season) => <option key={season} value={season}>{season}</option>)}
          </select>
        </div>
        <div className="grid gap-1">
          <label htmlFor="level" className="text-xs font-medium text-muted-foreground">Level</label>
          <select
            id="level"
            name="level"
            defaultValue={selectedLevel}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All levels</option>
            {levels.map((level) => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        <Button type="submit" variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" /> Apply
        </Button>
      </form>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
      </Button>
    </div>
  );
}
