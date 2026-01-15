import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitionActions } from '@/components/competition-actions';
import { BetaBanner } from '@/components/beta-banner';
import { ensureActiveGymnast } from '@/app/actions/gymnast';
import { CloudDownload } from 'lucide-react';

type ScoreItem = {
  apparatus: string;
  value: number | null;
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
  scores: ScoreItem[];
};

type PRItem = {
  key: string;
  eventLabel: string;
  score: number;
  place?: number | null;
  date: string | null;
  meetName: string;
};

/* ------------------------------
   Display helpers
-------------------------------- */

function displayApparatus(app: string) {
  switch (app) {
    case 'floor_exercise':
      return 'Floor';
    case 'balance_beam':
      return 'Beam';
    case 'uneven_bars':
      return 'Bars';
    case 'vault':
      return 'Vault';
    case 'parallel_bars':
      return 'P Bars';
    case 'still_rings':
      return 'Rings';
    case 'pommel_horse':
      return 'Pommel';
    case 'high_bar':
      return 'High Bar';
    default:
      return app.replace('_', ' ');
  }
}

function placeBadgeClass(place?: number | null) {
  if (!place) return 'bg-muted text-muted-foreground';
  if (place === 1) return 'bg-yellow-500/20 text-yellow-500';
  if (place === 2) return 'bg-gray-400/20 text-gray-300';
  if (place === 3) return 'bg-amber-700/20 text-amber-400';
  return 'bg-muted text-muted-foreground';
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return null;

  const startStr = new Date(start).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (end && end !== start) {
    const endStr = new Date(end).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} – ${endStr}`;
  }

  return startStr;
}

function competitionPrimaryDate(comp: Competition): string | null {
  // Prefer start_date, fall back to end_date
  return comp.start_date ?? comp.end_date ?? null;
}

function dateToSortValue(date: string | null): number {
  if (!date) return Number.POSITIVE_INFINITY;
  const t = new Date(date).getTime();
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function shouldReplacePR(current: PRItem | undefined, candidate: PRItem): boolean {
  if (!current) return true;

  if (candidate.score > current.score) return true;
  if (candidate.score < current.score) return false;

  // Tie on score: pick earliest date (deterministic), otherwise keep existing
  const candT = dateToSortValue(candidate.date);
  const curT = dateToSortValue(current.date);

  if (candT < curT) return true;
  if (candT > curT) return false;

  // Still tied: keep the one with "better" (lower) place if both exist
  const candP = candidate.place ?? null;
  const curP = current.place ?? null;
  if (candP !== null && curP === null) return true;
  if (candP === null && curP !== null) return false;
  if (candP !== null && curP !== null && candP < curP) return true;

  return false;
}

function buildPersonalRecords(competitions: Competition[]): PRItem[] {
  const bestByKey = new Map<string, PRItem>();

  for (const comp of competitions) {
    const meetName = comp.name;
    const date = competitionPrimaryDate(comp);

    // Event PRs
    for (const s of comp.scores ?? []) {
      if (s.value === null || s.value === undefined) continue;

      const key = s.apparatus;
      const candidate: PRItem = {
        key,
        eventLabel: displayApparatus(s.apparatus),
        score: s.value,
        place: s.place ?? null,
        date,
        meetName,
      };

      const current = bestByKey.get(key);
      if (shouldReplacePR(current, candidate)) bestByKey.set(key, candidate);
    }

    // All-Around PR
    if (comp.all_around_score !== null && comp.all_around_score !== undefined) {
      const key = 'all_around';
      const candidate: PRItem = {
        key,
        eventLabel: 'All Around',
        score: comp.all_around_score,
        place: comp.all_around_place ?? null,
        date,
        meetName,
      };

      const current = bestByKey.get(key);
      if (shouldReplacePR(current, candidate)) bestByKey.set(key, candidate);
    }
  }

  const preferredOrder = [
    'vault',
    'uneven_bars',
    'balance_beam',
    'floor_exercise',
    'all_around',
  ];

  const prs = Array.from(bestByKey.values());

  // Sort by preferred order first, then alphabetically
  prs.sort((a, b) => {
    const ai = preferredOrder.indexOf(a.key);
    const bi = preferredOrder.indexOf(b.key);
    const aRank = ai === -1 ? 999 : ai;
    const bRank = bi === -1 ? 999 : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.eventLabel.localeCompare(b.eventLabel);
  });

  return prs;
}

export default async function Dashboard() {
  const
