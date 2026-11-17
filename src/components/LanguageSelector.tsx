import { Globe } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { Language } from '../i18n';

export function LanguageSelector() {
  const { lang, setLang } = useLang();

  const toggle = () => {
    const next: Language = lang === 'it' ? 'en' : 'it';
    setLang(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
      title={lang === 'it' ? 'Switch to English' : 'Passa a italiano'}
    >
      <Globe className="w-5 h-5 sm:w-4 sm:h-4" />
      <span className="font-semibold uppercase">{lang === 'it' ? 'IT' : 'EN'}</span>
    </button>
  );
}
