export const APPARATUSES = [
  'vault',
  'uneven_bars',
  'balance_beam',
  'floor_exercise',
  'pommel_horse',
  'still_rings',
  'parallel_bars',
  'high_bar',
] as const;

export type Apparatus = (typeof APPARATUSES)[number];
export type GymnastProgram = 'female' | 'male';

export const APPARATUS_LABELS: Record<Apparatus, string> = {
  vault: 'Vault',
  uneven_bars: 'Bars',
  balance_beam: 'Beam',
  floor_exercise: 'Floor',
  pommel_horse: 'Pommel',
  still_rings: 'Rings',
  parallel_bars: 'P Bars',
  high_bar: 'High Bar',
};

export const PROGRAM_APPARATUSES: Record<GymnastProgram, Apparatus[]> = {
  female: ['vault', 'uneven_bars', 'balance_beam', 'floor_exercise'],
  male: [
    'floor_exercise',
    'pommel_horse',
    'still_rings',
    'vault',
    'parallel_bars',
    'high_bar',
  ],
};

export function displayApparatus(apparatus: string) {
  return APPARATUS_LABELS[apparatus as Apparatus] ?? apparatus.replaceAll('_', ' ');
}

export function apparatusForProgram(program?: string | null) {
  return PROGRAM_APPARATUSES[program === 'male' ? 'male' : 'female'];
}

export function formatCalendarDate(date: string | null, fallback = 'Date TBD') {
  if (!date) return fallback;
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return fallback;

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}

export function competitionSeason(date: string | null) {
  return date?.slice(0, 4) ?? 'Unscheduled';
}
