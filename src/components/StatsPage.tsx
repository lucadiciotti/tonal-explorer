import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, BarChart3, Headphones, Eye, Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tonic, SessionMode } from '../types';
import { supabase } from '../lib/supabase';
import { classifyError } from '../utils/noteComparison';
import { ConfusionMatrix, NoteRow } from './ConfusionMatrix';
import { FifthsErrorChart } from './FifthsErrorChart';
import { OctaveErrorChart } from './OctaveErrorChart';
import { ResponseTimeChart } from './ResponseTimeChart';

const TONICS: Tonic[] = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const WINDOW_PRESETS = [
  { label: '7 gg', days: 7 },
  { label: '14 gg', days: 14 },
  { label: '30 gg', days: 30 },
  { label: '90 gg', days: 90 },
];

interface ModeTab {
  mode: SessionMode;
  label: string;
  icon: typeof Eye;
  implemented: boolean;
}

const MODE_TABS: ModeTab[] = [
  { mode: 'listen-and-play', label: 'Ascolta e Suona', icon: Headphones, implemented: true },
  { mode: 'read-and-play', label: 'Leggi e Suona', icon: Eye, implemented: false },
  { mode: 'read-and-sing', label: 'Leggi e Canta', icon: Mic, implemented: false },
];

interface SessionRow {
  id: string;
  tonic: string;
  completed_at: string;
}

interface NoteRowWithSession extends NoteRow {
  session_id: string;
}

interface StatsPageProps {
  onBack: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Returns midnight UTC for a given date offset (0 = today, -1 = yesterday, etc.)
function dayStart(offsetFromToday: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetFromToday);
  return d;
}

export function StatsPage({ onBack }: StatsPageProps) {
  const [activeMode, setActiveMode] = useState<SessionMode>('listen-and-play');
  const [tonic, setTonic] = useState<Tonic>('C');
  const [windowDays, setWindowDays] = useState<number>(30);
  // windowOffset: how many days back the START of the window is from today
  // 0 = window ends today, higher = window is pushed further into the past
  const [windowOffset, setWindowOffset] = useState<number>(0);

  // All sessions for the mode+tonic combo (loaded once, filtered client-side)
  const [allSessions, setAllSessions] = useState<SessionRow[]>([]);
  const [allNotes, setAllNotes] = useState<NoteRowWithSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setWindowOffset(0);

    async function fetchData() {
      setLoading(true);

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('id, tonic, completed_at')
        .eq('mode', activeMode)
        .eq('tonic', tonic)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: true });

      if (cancelled) return;

      const fetchedSessions = (sessionData ?? []) as SessionRow[];
      setAllSessions(fetchedSessions);

      if (fetchedSessions.length === 0) {
        setAllNotes([]);
        setLoading(false);
        return;
      }

      const sessionIds = fetchedSessions.map(s => s.id);

      // Fetch in chunks of 200 to avoid URL length limits
      const chunkSize = 200;
      const noteChunks: NoteRowWithSession[] = [];
      for (let i = 0; i < sessionIds.length; i += chunkSize) {
        const chunk = sessionIds.slice(i, i + chunkSize);
        const { data: notesData } = await supabase
          .from('session_notes')
          .select('session_id, degree, expected_note, played_note, is_correct, reaction_time_ms')
          .in('session_id', chunk);
        if (cancelled) return;
        noteChunks.push(...((notesData ?? []) as NoteRowWithSession[]));
      }

      setAllNotes(noteChunks);
      setLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, [activeMode, tonic]);

  // Derived: earliest session date and max offset
  const earliestDate = useMemo(() => {
    if (allSessions.length === 0) return null;
    return new Date(allSessions[0].completed_at);
  }, [allSessions]);

  // Max offset = how far back we can push the window start so that at least the
  // earliest session is reachable. We anchor to today and go back.
  const maxOffset = useMemo(() => {
    if (!earliestDate) return 0;
    const todayStart = dayStart(0);
    const diffMs = todayStart.getTime() - earliestDate.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    return Math.max(0, diffDays);
  }, [earliestDate]);

  // Window boundaries
  const windowEnd = useMemo(() => {
    const d = dayStart(-windowOffset);
    d.setUTCHours(23, 59, 59, 999);
    return d;
  }, [windowOffset]);

  const windowStart = useMemo(() => {
    const d = dayStart(-(windowOffset + windowDays - 1));
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }, [windowOffset, windowDays]);

  // Sessions within window
  const windowSessions = useMemo(() => {
    return allSessions.filter(s => {
      const t = new Date(s.completed_at).getTime();
      return t >= windowStart.getTime() && t <= windowEnd.getTime();
    });
  }, [allSessions, windowStart, windowEnd]);

  const windowSessionIds = useMemo(() => new Set(windowSessions.map(s => s.id)), [windowSessions]);

  const noteRows = useMemo(() => {
    return allNotes.filter(n => windowSessionIds.has(n.session_id));
  }, [allNotes, windowSessionIds]);

  const activeTab = MODE_TABS.find(t => t.mode === activeMode)!;

  const summaryStats = useMemo(() => {
    if (noteRows.length === 0) return null;
    const total = noteRows.length;
    const correct = noteRows.filter(r => r.is_correct).length;
    const wrong = noteRows.filter(r => !r.is_correct);
    const octaveErrors = wrong.filter(r => {
      const played = r.played_note ?? r.playedNote ?? null;
      const expected = r.expected_note ?? r.expectedNote ?? null;
      return played && expected && classifyError(played, expected) === 'octave';
    }).length;
    const degreeErrors = wrong.length - octaveErrors;
    return { total, correct, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, octaveErrors, degreeErrors, wrongTotal: wrong.length };
  }, [noteRows]);

  const canGoBack = windowOffset < maxOffset;
  const canGoForward = windowOffset > 0;

  const stepOffset = (delta: number) => {
    setWindowOffset(o => Math.max(0, Math.min(maxOffset, o + delta)));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/80 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <BarChart3 className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Statistiche</h2>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {MODE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.mode === activeMode;
          return (
            <button
              key={tab.mode}
              onClick={() => setActiveMode(tab.mode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 dark:bg-sky-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {!activeTab.implemented ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <activeTab.icon className="w-8 h-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Prossimamente</h3>
          <p className="text-slate-500 dark:text-slate-400">
            Le statistiche per "{activeTab.label}" saranno disponibili in un prossimo aggiornamento.
          </p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <div className="flex flex-wrap items-end gap-6">
              {/* Tonic */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Tonalita'
                </label>
                <select
                  value={tonic}
                  onChange={(e) => setTonic(e.target.value as Tonic)}
                  className="px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm font-semibold bg-white dark:bg-slate-900"
                >
                  {TONICS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Window size */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Ampiezza finestra
                </label>
                <div className="flex gap-1">
                  {WINDOW_PRESETS.map(p => (
                    <button
                      key={p.days}
                      onClick={() => { setWindowDays(p.days); setWindowOffset(0); }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                        windowDays === p.days
                          ? 'bg-slate-800 dark:bg-sky-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Window navigator */}
            <div className="mt-5">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => stepOffset(windowDays)}
                  disabled={!canGoBack}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Finestra precedente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={maxOffset}
                    step={1}
                    value={windowOffset}
                    onChange={(e) => setWindowOffset(Number(e.target.value))}
                    disabled={maxOffset === 0}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-sky-500 disabled:opacity-40"
                  />
                </div>

                <button
                  onClick={() => stepOffset(-windowDays)}
                  disabled={!canGoForward}
                  className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Finestra successiva"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Date range badge + session count */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {formatDate(windowStart)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {formatDate(windowEnd)}
                  </span>
                </div>

                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-slate-700 dark:border-t-slate-300 rounded-full animate-spin" />
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {windowSessions.length === 0
                      ? 'Nessuna sessione in questo periodo'
                      : windowSessions.length === 1
                        ? '1 sessione'
                        : `${windowSessions.length} sessioni`}
                  </span>
                )}
              </div>

              {/* Timeline hint: show oldest and newest session dates */}
              {!loading && allSessions.length > 0 && maxOffset > 0 && (
                <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-8">
                  <span>{formatDate(new Date(allSessions[0].completed_at))}</span>
                  <span>oggi</span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-slate-300 dark:border-slate-600 border-t-slate-800 dark:border-t-slate-300 rounded-full animate-spin" />
            </div>
          ) : windowSessions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Nessuna sessione completata in questo periodo.</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Sposta la finestra o amplia l'intervallo.</p>
            </div>
          ) : (
            <>
              {summaryStats && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
                      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{summaryStats.accuracy}%</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Accuratezza</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
                      <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">{summaryStats.correct}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Corrette</p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center shadow-sm">
                      <p className="text-3xl font-bold text-slate-600 dark:text-slate-300">{summaryStats.total}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide">Totali</p>
                    </div>
                  </div>
                  {summaryStats.wrongTotal > 0 && (
                    <div className="flex items-center justify-center gap-4 mb-6 text-sm">
                      <span className="text-slate-400 dark:text-slate-500">{summaryStats.wrongTotal} {summaryStats.wrongTotal === 1 ? 'errore' : 'errori'}:</span>
                      {summaryStats.degreeErrors > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-full text-red-700 dark:text-red-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                          {summaryStats.degreeErrors} grado sbagliato
                        </span>
                      )}
                      {summaryStats.octaveErrors > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-full text-orange-700 dark:text-orange-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                          {summaryStats.octaveErrors} ottava sbagliata
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
                  Confusion Matrix
                </h3>
                <ConfusionMatrix notes={noteRows} tonic={tonic} />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
                  Errori nel Circolo delle Quinte
                </h3>
                <FifthsErrorChart notes={noteRows} tonic={tonic} />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
                  Errori di Ottava per Grado
                </h3>
                <OctaveErrorChart notes={noteRows} tonic={tonic} />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
                  Tempi di Risposta — Risposte Corrette
                </h3>
                <ResponseTimeChart notes={noteRows} tonic={tonic} correctOnly={true} />
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide mb-4">
                  Tempi di Risposta — Risposte Errate
                </h3>
                <ResponseTimeChart notes={noteRows} tonic={tonic} correctOnly={false} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
