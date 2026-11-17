import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, TranslationKeys } from '../i18n';

interface LanguageContextType {
  lang: Language;
  t: TranslationKeys;
  setLang: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'tex-lang';

function detectInitialLang(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'it' || stored === 'en') return stored;
  return navigator.language.startsWith('en') ? 'en' : 'it';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('it');

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLang must be used within a LanguageProvider');
  }
  return context;
}
