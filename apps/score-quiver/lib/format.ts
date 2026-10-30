const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Format an ISO `YYYY-MM-DD` date as `Mon D, YYYY` (or `Mon D` when `short`)
 * without the Date constructor, which would apply a timezone offset.
 */
export function formatDate(value: string | null | undefined, short = false): string {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  const month = MONTHS[Number(m) - 1];
  if (!month || !d) return value;
  return short ? `${month} ${Number(d)}` : `${month} ${Number(d)}, ${y}`;
}

export function formatNumber(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
