import { useState, useEffect } from 'react';
import { Music, LogOut, BarChart3 } from 'lucide-react';
import { Settings } from './components/Settings';
import { SessionDisplay } from './components/SessionDisplay';
import { StatsPage } from './components/StatsPage';
import { ConfusionMatrix } from './components/ConfusionMatrix';
import { FifthsErrorChart } from './components/FifthsErrorChart';
import { OctaveErrorChart } from './components/OctaveErrorChart';
import { ResponseTimeChart } from './components/ResponseTimeChart';
import { AuthPage } from './components/AuthPage';
import { useAuth } from './contexts/AuthContext';
import { SessionSettings, Note, SessionStats, ErrorLogEntry, NoteResult } from './types';
import { classifyError } from './utils/noteComparison';
import { generateNoteSequence } from './utils/noteGenerator';
import { supabase } from './lib/supabase';
import { AudioManager } from './lib/audio/AudioManager';
import { MidiRenderer } from './lib/audio/MidiRenderer';
import { SoundfontRenderer } from './lib/audio/SoundfontRenderer';

type AppState = 'settings' | 'session' | 'completed' | 'stats';

function App() {
  const { user, loading, signOut } = useAuth();
  const [appState, setAppState] = useState<AppState>('settings');
  const [currentSettings, setCurrentSettings] = useState<SessionSettings | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [audioManager, setAudioManager] = useState<AudioManager | null>(null);
  const [sessionResults, setSessionResults] = useState<{ correct: number; total: number; stats: SessionStats; errorLog: ErrorLogEntry[]; noteResults: NoteResult[] } | null>(null);

  useEffect(() => {
    return () => {
      if (audioManager) {
        audioManager.cleanup();
      }
    };
  }, [audioManager]);

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

  const handleStartSession = async (settings: SessionSettings, rendererType: 'web-audio' | 'midi' | 'soundfont', midiProgram?: number, midiDroneProgram?: number, soundfontNote?: string, soundfontDrone?: string) => {
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
      const manager = new AudioManager(rendererType);
      await manager.initialize();

      if (rendererType === 'midi') {
        const renderer = manager.getRenderer() as MidiRenderer;
        if (renderer && 'setProgram' in renderer) {
          if (midiProgram !== undefined) {
            renderer.setNoteProgram(midiProgram);
          }
          if (midiDroneProgram !== undefined) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12 relative">
          <div className="absolute right-0 top-0 flex items-center gap-1">
            <button
              onClick={() => setAppState('stats')}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition-colors"
              title="Statistiche"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Statistiche</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-lg transition-colors"
              title="Esci"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Music className="w-10 h-10 text-slate-800" />
            <h1 className="text-5xl font-bold text-slate-800">Tonal Explorer</h1>
          </div>
          <p className="text-slate-600 text-lg">Music Training Assistant</p>
          <p className="text-slate-400 text-xs mt-1">{user.email}</p>
        </header>

        <main>
          {appState === 'stats' && <StatsPage onBack={() => setAppState('settings')} />}

          {appState === 'settings' && <Settings onStart={handleStartSession} />}

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
            />
          )}

          {appState === 'completed' && (
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Music className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Session Completed!</h2>
                <p className="text-slate-600">Great job on completing your training session.</p>
              </div>

              {sessionResults && sessionResults.total > 0 && (() => {
                const wrong = sessionResults.noteResults.filter(r => !r.isCorrect);
                const octaveErrors = wrong.filter(r => r.playedNote && r.expectedNote && classifyError(r.playedNote, r.expectedNote) === 'octave').length;
                const degreeErrors = wrong.length - octaveErrors;
                return (
                <>
                  <div className="p-6 bg-slate-50 rounded-lg text-center mb-4">
                    <p className="text-2xl font-bold text-slate-800 mb-2">
                      Hai indovinato {sessionResults.correct} {sessionResults.correct === 1 ? 'nota' : 'note'}
                    </p>
                    <p className="text-slate-600">
                      su {sessionResults.total} totali ({Math.round((sessionResults.correct / sessionResults.total) * 100)}%)
                    </p>
                    {wrong.length > 0 && (
                      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                        <span className="text-slate-400">{wrong.length} {wrong.length === 1 ? 'errore' : 'errori'}:</span>
                        {degreeErrors > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 border border-red-200 rounded-full text-red-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            {degreeErrors} grado sbagliato
                          </span>
                        )}
                        {octaveErrors > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-full text-orange-700 font-medium">
                            <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                            {octaveErrors} ottava sbagliata
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Hit consecutivi</p>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-sm text-slate-500">Max</span>
                          <span className="ml-2 text-2xl font-bold text-green-800">{sessionResults.stats.maxHitStreak}</span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500">Min</span>
                          <span className="ml-2 text-2xl font-bold text-green-800">{sessionResults.stats.minHitStreak}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Miss consecutivi</p>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-sm text-slate-500">Max</span>
                          <span className="ml-2 text-2xl font-bold text-red-800">{sessionResults.stats.maxMissStreak}</span>
                        </div>
                        <div>
                          <span className="text-sm text-slate-500">Min</span>
                          <span className="ml-2 text-2xl font-bold text-red-800">{sessionResults.stats.minMissStreak}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sessionResults.stats.reactionTime.count > 0 && (
                    <div className="p-4 bg-sky-50 rounded-lg border border-sky-200 mb-4">
                      <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3">Tempo di reazione (solo hit)</p>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Media</p>
                          <p className="text-xl font-bold text-sky-800">{(sessionResults.stats.reactionTime.mean / 1000).toFixed(1)}s</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Moda</p>
                          <p className="text-xl font-bold text-sky-800">{(sessionResults.stats.reactionTime.mode / 1000).toFixed(1)}s</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Min</p>
                          <p className="text-xl font-bold text-sky-800">{(sessionResults.stats.reactionTime.min / 1000).toFixed(1)}s</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-slate-500">Max</p>
                          <p className="text-xl font-bold text-sky-800">{(sessionResults.stats.reactionTime.max / 1000).toFixed(1)}s</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Su {sessionResults.stats.reactionTime.count} hit</p>
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Confusion Matrix</p>
                    <ConfusionMatrix
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Errori nel Circolo delle Quinte</p>
                    <FifthsErrorChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Errori di Ottava per Grado</p>
                    <OctaveErrorChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Tempi di Risposta — Risposte Corrette</p>
                    <ResponseTimeChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                      correctOnly={true}
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 mb-6">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Tempi di Risposta — Risposte Errate</p>
                    <ResponseTimeChart
                      notes={sessionResults.noteResults}
                      tonic={currentSettings?.tonic ?? 'C'}
                      correctOnly={false}
                    />
                  </div>

                  {/* legacy-error-table: showLegacyErrorTable */}
                  {localStorage.getItem('showLegacyErrorTable') === 'true' && sessionResults.errorLog.length > 0 && (
                    <div className="mb-6 text-left">
                      <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">Dettaglio errori</p>
                      <div className="overflow-hidden rounded-lg border border-red-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-red-50 text-red-800">
                              <th className="px-3 py-2 text-left font-semibold">#</th>
                              <th className="px-3 py-2 text-left font-semibold">Drone</th>
                              <th className="px-3 py-2 text-left font-semibold">Grado</th>
                              <th className="px-3 py-2 text-left font-semibold">Attesa</th>
                              <th className="px-3 py-2 text-left font-semibold">Cantata</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessionResults.errorLog.map((entry, i) => (
                              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="px-3 py-2 text-slate-500 font-mono">{entry.stepIndex + 1}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700">{entry.drone}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-slate-700">{entry.degree}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-green-700">{entry.expectedNote}</td>
                                <td className="px-3 py-2 font-mono font-semibold text-red-700">{entry.sungNote}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
                );
              })()}

              <div className="text-center">
                <button
                  onClick={handleNewSession}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  Start New Session
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
