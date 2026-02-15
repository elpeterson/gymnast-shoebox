'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function ThemeSync({ serverTheme }: { serverTheme: string }) {
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (serverTheme && serverTheme !== theme) {
      setTheme(serverTheme);
    }
  }, [serverTheme, setTheme, theme]);

  return null;
}
