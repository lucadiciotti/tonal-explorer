export type ThemeMode = 'auto' | 'light' | 'dark';

const THEME_KEY = 'mzt-theme';

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|CriOS|FxiOS/i.test(navigator.userAgent);
}

export function getDefaultTheme(): ThemeMode {
  return isMobile() ? 'dark' : 'light';
}

export function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'auto' || stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  return getDefaultTheme();
}

function shouldUseDark(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return isMobile();
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  if (shouldUseDark(theme)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function saveTheme(theme: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

export function initTheme(): void {
  applyTheme(getStoredTheme());
}
