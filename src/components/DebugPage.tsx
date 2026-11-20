import { ArrowLeft, Bug } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { getItalianChromaticScale, getItalianNoteName } from '../utils/italianNotes';

const ALL_TONICS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'] as const;

const ALL_DEGREES = ['1', 'b2', '2', 'b3', '3', '4', '#4', '5', 'b6', '6', 'b7', '7'] as const;

const DEGREE_LABELS: Record<string, string> = {
  '1': '1', 'b2': 'b2', '2': '2', 'b3': 'b3', '3': '3',
  '4': '4', '#4': '#4', '5': '5', 'b6': 'b6', '6': '6',
  'b7': 'b7', '7': '7',
};

interface DebugPageProps {
  onBack: () => void;
}

export function DebugPage({ onBack }: DebugPageProps) {
  const { t } = useLang();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bug className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t.debug.title}</h2>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.debug.chromaticScaleIntro}</p>

      <div className="space-y-4">
        {ALL_TONICS.map((tonic) => {
          const chromatic = getItalianChromaticScale(tonic);
          return (
            <div
              key={tonic}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5"
            >
              <div className="flex items-baseline gap-3 mb-3">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 font-mono">{tonic}</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">{t.debug.tonic}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t.debug.degree}</th>
                      {ALL_DEGREES.map((deg) => (
                        <th key={deg} className="text-center py-2 px-2 text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {DEGREE_LABELS[deg]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 px-3 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t.debug.italianName}</td>
                      {ALL_DEGREES.map((deg) => {
                        let noteName: string;
                        try {
                          noteName = getItalianNoteName(tonic, deg as any);
                        } catch {
                          noteName = '?';
                        }
                        return (
                          <td key={deg} className="text-center py-2 px-2 font-mono text-slate-700 dark:text-slate-200">
                            {noteName}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{t.debug.chromaticIdx}</td>
                      {chromatic.map((note, i) => (
                        <td key={i} className="text-center py-2 px-2 font-mono text-slate-500 dark:text-slate-400">
                          {note}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {chromatic.map((note, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-xs text-slate-600 dark:text-slate-300"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
