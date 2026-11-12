import { Globe } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { Locale } from '../i18n/translations';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const toggle = () => {
    const next: Locale = locale === 'it' ? 'en' : 'it';
    setLocale(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
      title={locale === 'it' ? 'Switch to English' : 'Passa a Italiano'}
    >
      <Globe className="w-5 h-5 sm:w-4 sm:h-4" />
      <span className="text-xs font-semibold uppercase">{locale}</span>
    </button>
  );
}
