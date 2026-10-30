export const MAG_APPARATUS = [
  { id: 'floor_exercise', label: 'Floor' },
  { id: 'pommel_horse', label: 'Pommel' },
  { id: 'still_rings', label: 'Rings' },
  { id: 'vault', label: 'Vault' },
  { id: 'parallel_bars', label: 'P Bars' },
  { id: 'high_bar', label: 'High Bar' },
];

export const WAG_APPARATUS = [
  { id: 'vault', label: 'Vault' },
  { id: 'uneven_bars', label: 'Bars' },
  { id: 'balance_beam', label: 'Beam' },
  { id: 'floor_exercise', label: 'Floor' },
];

export const COMPETITIONS_PAGE_SIZE = 10;

// Men's competitive levels, mirroring the values MSO actually stores.
// Numeric Development Program levels, stored as the bare number string.
export const LEVEL_OPTIONS = ['3', '4', '5', '6', '7', '8', '9', '10'];

// Elite / special men's level codes (no numeric division).
export const ELITE_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'E', label: 'Elite' },
  { value: 'J6', label: 'Junior 6' },
  { value: 'J7', label: 'Junior 7' },
  { value: 'SR', label: 'Senior' },
  { value: 'PL', label: 'PL' },
];

// Second-field options are context-aware by level:
//   compulsory levels 3–6 split by Division 1/2;
//   optional levels 7–10 split by an Elite/Junior/Senior track.
export const DIVISION_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: 'Division 1' },
  { value: '2', label: 'Division 2' },
];

export const TRACK_OPTIONS: { value: string; label: string }[] = [
  { value: 'E', label: 'Elite' },
  { value: 'J', label: 'Junior' },
  { value: 'S', label: 'Senior' },
];

/**
 * The qualifier (second dropdown) options for a men's level, or [] when the
 * level takes no qualifier (level 7, or the elite/special codes). Returns the
 * label to show for the field too.
 */
export function qualifierForLevel(level: string): {
  label: string;
  options: { value: string; label: string }[];
} {
  if (['3', '4', '5', '6'].includes(level)) {
    return { label: 'Division', options: DIVISION_OPTIONS };
  }
  if (['8', '9', '10'].includes(level)) {
    return { label: 'Track', options: TRACK_OPTIONS };
  }
  return { label: 'Division', options: [] };
}

export const ALL_APPARATUS = [
  ...MAG_APPARATUS,
  { id: 'uneven_bars', label: 'Bars' },
  { id: 'balance_beam', label: 'Beam' },
];
