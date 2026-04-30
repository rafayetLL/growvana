// Class-based Tailwind dark mode, with the user's choice persisted in
// localStorage. `initTheme()` runs in main.jsx before React mounts so the
// initial paint matches the saved theme (no flash). `useTheme()` provides a
// reactive [theme, toggle, setTheme] tuple for components.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'growvana.theme';

function systemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function initTheme() {
  if (typeof document === 'undefined') return;
  const theme = readStored() ?? systemTheme();
  apply(theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState(() => readStored() ?? systemTheme());

  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — apply-only fallback */
    }
  }, [theme]);

  function setTheme(next) {
    setThemeState(next === 'dark' ? 'dark' : 'light');
  }
  function toggle() {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return [theme, toggle, setTheme];
}
