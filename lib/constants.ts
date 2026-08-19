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

// Competitive levels (Development Program). Stored as the bare number string.
export const LEVEL_OPTIONS = ['3', '4', '5', '6', '7', '8', '9', '10'];

// Divisions within a level, when a gym uses them. Empty = no division.
export const DIVISION_OPTIONS = ['1', '2'];

export const ALL_APPARATUS = [
  ...MAG_APPARATUS,
  { id: 'uneven_bars', label: 'Bars' },
  { id: 'balance_beam', label: 'Beam' },
];
