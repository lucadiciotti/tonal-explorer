import { useState, useEffect, useRef } from 'react';
import { Music, LogOut, BarChart3, SlidersHorizontal, Home, Users } from 'lucide-react';
import { useI18n } from './i18n/I18nContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Settings } from './components/Settings';
import { SessionDisplay } from './components/SessionDisplay';
import { StatsPage } from './components/StatsPage';
import { ConfusionMatrix } from './components/ConfusionMatrix';
import { FifthsErrorChart } from './components/FifthsErrorChart';
import { OctaveErrorChart } from './components/OctaveErrorChart';
import { ResponseTimeChart } from './components/ResponseTimeChart';
import { AuthPage } from './components/AuthPage';
import { AdvancedSettings } from './components/AdvancedSettings';
import { AdminUsersPage } from './components/AdminUsersPage';
import { AdminStatsPage } from './components/AdminStatsPage';
import { useAuth } from './contexts/AuthContext';
import { SessionSettings, Note, SessionStats, ErrorLogEntry, NoteResult } from './types';
import { classifyError } from './utils/noteComparison';
import { APP_VERSION } from './version';
import { generateNoteSequence } from './utils/noteGenerator';
import { supabase } from './lib/supabase';
import { AudioManager } from './lib/audio/AudioManager';
import { MidiRenderer } from './lib/audio/MidiRenderer';
import { SoundfontRenderer } from './lib/audio/SoundfontRenderer';

type AppState = 'settings' | 'session' | 'completed' | 'stats' | 'advanced' | 'admin-users' | 'admin-stats' | 'admin-global-stats';

function App() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const { t } = useI18n();
  const [appState, setAppState] = useState<AppState>('settings');
  const [currentSettings, setCurrentSettings] = useState<SessionSettings | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audioManager, setAudioManager] = useState<AudioManager | null>(null);
  const [sessionResults, setSessionResults] = useState<{ correct: number; total: number; stats: SessionStats; errorLog: ErrorLogEntry[]; noteResults: NoteResult[] } | null>(null);
  const [adminSelectedUser, setAdminSelectedUser] = useState<{ id: string; email: string } | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    return () => {
      if (audioManager) {
        audioManager.cleanup();
      }
    };
  }, [audioManager]);

  useEffect(() => {
    const acquireWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Wake lock request failed — ignore silently
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };

    if (appState === 'session') {
      acquireWakeLock();
    } else {
      releaseWakeLock();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && appState === 'session' && !wakeLockRef.current) {
        acquireWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [appState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleStartSession = async (settings: SessionSettings, rendererType: 'web-audio' | 'midi' | 'soundfont', midiProgram?: number, midiDroneProgram?: number, soundfontNote?: string, soundfontDrone?: string, midiOutputDeviceId?: string, midiInputDeviceId?: string, monotimbral?: boolean) => {
    const generatedNotes = generateNoteSequence(settings.numNotes);
    setNotes(generatedNotes);
    setCurrentSettings(settings);

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        tonic: settings.tonic,
        num_notes: settings.numNotes,
        step_duration: settings.stepDuration,
        mode: settings.mode,
        ignore_octaves: settings.ignoreOctaves,
        ignore_step_duration: settings.ignoreStepDuration,
        sing_hold_duration: settings.singHoldDuration,
        note_transition_delay: settings.noteTransitionDelay,
      })
      .select()
      .maybeSingle();

    if (data && !error) {
      setSessionId(data.id);
    }

    try {
      console.log('Starting audio with tonic:', settings.tonic, 'using', rendererType);
      const manager = new AudioManager(rendererType, midiOutputDeviceId, midiInputDeviceId, monotimbral ?? false);
      await manager.initialize();

      if (rendererType === 'midi') {
        const renderer = manager.getRenderer() as MidiRenderer;
        if (renderer && 'setProgram' in renderer) {
          if (midiProgram !== undefined) {
            renderer.setNoteProgram(midiProgram);
          }
          if (midiDroneProgram !== undefined && !monotimbral) {
            renderer.setDroneProgram(midiDroneProgram);
          }
        }
      }

      if (rendererType === 'soundfont') {
        const renderer = manager.getRenderer() as SoundfontRenderer;
        if (soundfontNote) {
          await renderer.setNoteInstrument(soundfontNote);
        }
        if (soundfontDrone) {
          await renderer.setDroneInstrument(soundfontDrone);
        }
      }

      await manager.playDrone(settings.tonic);
      setAudioManager(manager);
      console.log('Audio started successfully');
    } catch (error) {
      console.error('Failed to start audio:', error);
      if (rendererType === 'midi') {
        console.log('Falling back to Web Audio');
        try {
          const fallbackManager = new AudioManager('web-audio');
          await fallbackManager.initialize();
          await fallbackManager.playDrone(settings.tonic);
          setAudioManager(fallbackManager);
          console.log('Web Audio fallback successful');
        } catch (fallbackError) {
          console.error('Web Audio fallback also failed:', fallbackError);
        }
      }
    }

    setAppState('session');
  };

  const handleCompleteSession = async (correctCount: number, totalCount: number, stats: SessionStats, errorLog: ErrorLogEntry[], noteResults: NoteResult[]) => {
    setSessionResults({ correct: correctCount, total: totalCount, stats, errorLog, noteResults });

    if (sessionId) {
      await supabase
        .from('sessions')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (noteResults.length > 0) {
        const rows = noteResults.map(nr => ({
          session_id: sessionId,
          user_id: user.id,
          step_index: nr.stepIndex,
          degree: nr.degree,
          expected_note: nr.expectedNote,
          played_note: nr.playedNote,
          is_correct: nr.isCorrect,
          reaction_time_ms: nr.reactionTimeMs,
        }));
        await supabase.from('session_notes').insert(rows);
      }
    }

    if (audioManager) {
      audioManager.stopDrone();
    }

    setAppState('completed');
  };

  const handleCancelSession = () => {
    if (audioManager) {
      audioManager.stopDrone();
    }

    setAppState('settings');
    setNotes([]);
    setCurrentSettings(null);
    setSessionId(null);
  };

  const handleNewSession = () => {
    setAppState('settings');
    setNotes([]);
    setCurrentSettings(null);
    setSessionId(null);
    setSessionResults(null);
  };

  const completedWrong = sessionResults ? sessionResults.noteResults.filter(r => !r.isCorrect) : [];
  const completedOctaveErrors = completedWrong.filter(r => r.playedNote && r.expectedNote && classifyError(r.playedNote, r.expectedNote) === 'octave').length;
  const completedDegreeErrors = completedWrong.length - completedOctaveErrors;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"
      onTouchStart={(e) => {
        if (appState === 'settings' || appState === 'advanced') {
          touchStartX.current = e.touches[0].clientX;
          touchStartY.current = e.touches[0].clientY;
        }
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
        touchStartX.current = null;
        touchStartY.current = null;
        if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
        if (dx > 0 && appState === 'settings') setAppState('advanced');
        else if (dx < 0 && appState === 'advanced') setAppState('settings');
      }}
    >
      <div className="container mx-auto px-4 py-8">
        <header className="mb-10">
          <div className="flex items-center justify-between gap-0.5 sm:gap-1 mb-6">
            <LanguageSwitcher />
            <div className="flex items-center gap-0.5 sm:gap-1">
              <button
                onClick={() => setAppState('settings')}
                className="flex items-center gap-2 p-2 sm:hidden text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                title={t('home')}
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                onClick={() => setAppState('advanced')}
                className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                title={t('settings')}
              >
                <SlidersHorizontal className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('settings')}</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setAppState('admin-users')}
                  className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                  title={t('users')}
                >
                  <Users className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('users')}</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setAppState('admin-global-stats')}
                  className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                  title={t('adminGlobalStats')}
                >
                  <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('global')}</span>
                </button>
              )}
              {!isAdmin && (
                <button
                  onClick={() => setAppState('stats')}
                  className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                  title={t('statistics')}
                >
                  <BarChart3 className="w-5 h-5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">{t('stats')}</span>
                </button>
              )}
              <button
                onClick={signOut}
                className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80 rounded-lg transition-colors"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </button>
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
              <Music className="w-7 h-7 sm:w-10 sm:h-10 text-slate-800 dark:text-slate-100" />
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-slate-800 dark:text-slate-100">TEx</h1>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg">{t('appTagline')}</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">{user.email}</p>
            <p className="text-slate-300 dark:text-slate-600 text-xs mt-0.5">v{APP_VERSION}</p>
          </div>
        </header>

        <main>
          {appState === 'stats' && <StatsPage onBack={() => setAppState('settings')} />}

          {appState === 'admin-users' && (
            <AdminUsersPage
              onBack={() => setAppState('settings')}
              onSelectUserStats={(userId, email) => {
                setAdminSelectedUser({ id: userId, email });
                setAppState('admin-stats');
              }}
            />
          )}

          {appState === 'admin-stats' && adminSelectedUser && (
            <AdminStatsPage
              onBack={() => setAppState('admin-users')}
              userId={adminSelectedUser.id}
              userEmail={adminSelectedUser.email}
            />
          )}

          {appState === 'admin-global-stats' && (
            <AdminStatsPage
              onBack={() => setAppState('settings')}
              userId={null}
              userEmail={null}
            />
          )}

          {appState === 'advanced' && (
            <AdvancedSettings onBack={() => setAppState('settings')} />
          )}

          {appState === 'settings' && (
            <Settings onStart={handleStartSession} />
          )}

          {appState === 'session' && currentSettings && (
            <SessionDisplay
              notes={notes}
              stepDuration={currentSettings.stepDuration}
              tonic={currentSettings.tonic}
              audioManager={audioManager}
              onComplete={handleCompleteSession}
              onCancel={handleCancelSession}
              ignoreOctaves={currentSettings.ignoreOctaves}
              ignoreStepDuration={currentSettings.ignoreStepDuration}
              mode={currentSettings.mode}
              singHoldDuration={currentSettings.singHoldDuration}
              noteTransitionDelay={currentSettings.noteTransitionDelay}
              tonalRetention={currentSettings.tonalRetention}
              tonalRetentionDuration={currentSettings.tonalRetentionDuration}
              debugMode={currentSettings.debugMode}
              voiceAnnounceDegree={currentSettings.voiceAnnounceDegree}
            />
          )}

          {appState === 'completed' && (
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t('sessionCompleted')}</h2>
                <p className="text-slate-600 dark:text-slate-300">{t('greatJob')}</p>
              </div>

              {sessionResults && sessionResults.total > 0 && (
                <>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-lg text-center mb-4">
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                      {t('youGotNotes')} {sessionResults.correct} {sessionResults.correct === 1 ? t('noteCorrect') : t('notesCorrect')}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {t('outOf')} {sessionResults.total} {t('total')} ({Math.round((sessionResults.correct / sessionResults.total) * 100)}%)
                    </p>
                    {completedWrong.length > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                        <span className="text-slate-400 dark:text-slate-500">{completedWrong.length} {completedWrong.length === 1 ? t('error') : t('errors')}:</span>
                        {completedDegreeErrors > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-red-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            {completedDegreeErrors} {t('wrongDegree')}
                          </span>
                        )}
                        {completedOctaveErrors > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-orange-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                            {completedOctaveErrors} {t('wrongOctave')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2">{t('hitStreaks')}</p>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{t('max')}</span>
                          <span className="ml-2 text-2xl font-bold text-green-800 dark:text-green-400">{sessionResults.stats.maxHitStreak}</span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{t('min')}</span>
                          <span className="ml-2 text-2xl font-bold text-green-800 dark:text-green-400">{sessionResults.stats.minHitStreak}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-2">{t('missStreaks')}</p>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{t('max')}</span>
                          <span className="ml-2 text-2xl font-bold text-red-800 dark:text-red-400">{sessionResults.stats.maxMissStreak}</span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{t('min')}</span>
                          <span className="ml-2 text-2xl font-bold text-red-800 dark:text-red-400">{sessionResults.stats.minMissStreak}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sessionResults.stats.reactionTime.count > 0 && (
                    <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-lg border border-sky-200 dark:border-sky-800 mb-4">
                      <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wide mb-3">{t('reactionTime')}</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('mean')}</p>
                          <p className="text-xl font-bold text-sky-800 dark:text-sky-400">{(sessionResults.stats.reactionTime.mean / 1000).toFixed(1)}s</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('statMode')}</p>
                          <p className="text-xl font-bold text-sky-800 dark:text-sky-400">{(sessionResults.stats.reactionTime.mode / 1000).toFixed(1)}s</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('min')}</p>
                          <p className="text-xl font-bold text-sky-800 dark:text-sky-400">{(sessionResults.stats.reactionTime.min / 1000).toFixed(1)}s</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t('max')}</p>
                          <p className="text-xl font-bold text-sky-800 dark:text-sky-400">{(sessionResults.stats.reactionTime.max / 1000).toFixed(1)}s</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{t('onHits')} {sessionResults.stats.reactionTime.count} {t('hits')}</p>
                    </div>
                  )}

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{t('confusionMatrix')}</p>
                    <ConfusionMatrix
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{t('fifthsErrors')}</p>
                    <FifthsErrorChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{t('octaveErrorsByDegree')}</p>
                    <OctaveErrorChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{t('responseTimeCorrect')}</p>
                    <ResponseTimeChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                      correctOnly={true}
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 mb-6">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{t('responseTimeWrong')}</p>
                    <ResponseTimeChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                      correctOnly={false}
                    />
                  </div>

                  {/* legacy-error-table: showLegacyErrorTable */}
                  {localStorage.getItem('showLegacyErrorTable') === 'true' && sessionResults.errorLog.length > 0 && (
                    <div className="mb-6 text-left">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide mb-3">{t('errorDetail')}</p>
                      <div className="overflow-hidden rounded-lg border border-red-200 dark:border-red-800">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-400">
                              <th className="px-3 py-2 text-left font-semibold">#</th>
                              <th className="px-3 py-2 text-left font-semibold">{t('colDrone')}</th>
                              <th className="px-3 py-2 text-left font-semibold">{t('colDegree')}</th>
                              <th className="px-3 py-2 text-left font-semibold">{t('colExpected')}</th>
                              <th className="px-3 py-2 text-left font-semibold">{t('colSung')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionResults.errorLog.map((entry, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}>
                                <td className="px-3 py-2 text-slate-500 dark:text-slate-400 font-mono">{entry.stepIndex + 1}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-200">{entry.drone}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700 dark:text-slate-200">{entry.degree}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-green-700 dark:text-green-400">{entry.expectedNote}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-red-700 dark:text-red-400">{entry.sungNote}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="text-center">
                <button
                  onClick={handleNewSession}
                  className="bg-slate-800 dark:bg-sky-600 hover:bg-slate-900 dark:hover:bg-sky-500 text-white font-bold py-4 px-8 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  {t('startNewSession')}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
