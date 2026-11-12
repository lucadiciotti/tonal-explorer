import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Locale, TranslationKey, translations } from './translations';

const STORAGE_KEY = 'mzt-locale';

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch {
    // ignore
  }
  return 'it';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore
    }
  }, []);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>) => {
    const dict = translations[locale];
    let str: string = dict[key] ?? translations.it[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
