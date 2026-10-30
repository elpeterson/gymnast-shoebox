import { describe, it, expect } from 'vitest';
import { parseSettingUpdate } from '../settings';

describe('parseSettingUpdate', () => {
  it('accepts known themes', () => {
    expect(parseSettingUpdate('theme', 'dark')).toEqual({ theme: 'dark' });
    expect(parseSettingUpdate('theme', 'system')).toEqual({ theme: 'system' });
  });

  it('rejects unknown themes and wrong types', () => {
    expect(parseSettingUpdate('theme', 'neon')).toBeNull();
    expect(parseSettingUpdate('theme', true)).toBeNull();
    expect(parseSettingUpdate('show_placements', 'true')).toBeNull();
  });

  it('accepts boolean toggles', () => {
    expect(parseSettingUpdate('show_start_values', true)).toEqual({ show_start_values: true });
    expect(parseSettingUpdate('show_placements', false)).toEqual({ show_placements: false });
  });

  it('rejects columns outside the whitelist', () => {
    expect(parseSettingUpdate('user_id', 'someone-else')).toBeNull();
    expect(parseSettingUpdate('id', 'x')).toBeNull();
    expect(parseSettingUpdate('__proto__', {})).toBeNull();
  });
});
