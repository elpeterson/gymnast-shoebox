export type UserSettings = {
  theme: string;
  show_start_values: boolean;
  show_placements: boolean;
};

const THEMES = ['light', 'dark', 'system'];

/**
 * Validate a single setting update coming from the client. Server actions take
 * arbitrary input at runtime, so the key must be a known column and the value
 * must have that column's type.
 */
export function parseSettingUpdate(
  key: unknown,
  value: unknown,
): Partial<UserSettings> | null {
  if (key === 'theme') {
    return typeof value === 'string' && THEMES.includes(value)
      ? { theme: value }
      : null;
  }
  if (key === 'show_start_values' || key === 'show_placements') {
    return typeof value === 'boolean' ? { [key]: value } : null;
  }
  return null;
}
