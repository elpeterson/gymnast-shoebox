// Decode USA Archery Class/Div codes like "RU13W" (Recurve, Under 13, Women).
// Unknown shapes fall back to the raw code; nothing downstream depends on the
// decode succeeding.

export const BOW_STYLES: Record<string, string> = {
  R: 'recurve',
  B: 'barebow',
  C: 'compound',
  L: 'longbow',
  T: 'traditional',
};

export const BOW_STYLE_LABELS: Record<string, string> = {
  recurve: 'Recurve',
  barebow: 'Barebow',
  compound: 'Compound',
  longbow: 'Longbow',
  traditional: 'Traditional',
};

export type Division = {
  code: string;
  bowStyle: string | null;
  ageClass: string | null;
  gender: string | null;
};

export function parseDivision(code: string | null | undefined): Division {
  const raw = (code ?? '').trim().toUpperCase();
  const m = raw.match(/^([RBCLT])(U\d{2}|\d{2}\+|[A-Z]*?)([MWX])$/);
  if (!m) return { code: raw, bowStyle: BOW_STYLES[raw[0]] ?? null, ageClass: null, gender: null };
  return {
    code: raw,
    bowStyle: BOW_STYLES[m[1]] ?? null,
    ageClass: m[2] || null,
    gender: m[3],
  };
}

export function bowStyleLabel(bowStyle: string | null | undefined): string {
  return (bowStyle && BOW_STYLE_LABELS[bowStyle]) || 'Unknown bow';
}
