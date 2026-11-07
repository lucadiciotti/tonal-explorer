import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { SessionSettings, Tonic, SessionMode } from '../types';
import { AudioRendererType } from '../lib/audio/AudioManager';

interface SettingsProps {
  onStart: (settings: SessionSettings, rendererType: AudioRendererType, midiProgram?: number, midiDroneProgram?: number, soundfontNote?: string, soundfontDrone?: string, midiOutputDeviceId?: string, midiInputDeviceId?: string, monotimbral?: boolean) => void;
}

// Organized in circle of fifths order starting from C at top, with enharmonic pairs grouped
const TONIC_GROUPS: Tonic[][] = [
  ['C'],
  ['G'],
  ['D'],
  ['A'],
  ['E'],
  ['B', 'Cb'],
  ['F#', 'Gb'],
  ['C#', 'Db'],
  ['Ab'],
  ['Eb'],
  ['Bb'],
  ['F']
];

const STORAGE_KEY = 'mzt-settings';

interface StoredSettings {
  tonic: Tonic;
  numNotes: number;
  stepDuration: number;
  audioMode: AudioRendererType;
  midiProgram: number;
  selectedCategory: string;
  midiDroneProgram: number;
  selectedDroneCategory: string;
  ignoreOctaves: boolean;
  ignoreStepDuration: boolean;
  mode: SessionMode;
  singHoldDuration: number;
  noteTransitionDelay: number;
  sfNoteInstrument: string;
  sfNoteCategory: string;
  sfDroneInstrument: string;
  sfDroneCategory: string;
  tonalRetention: boolean;
  tonalRetentionDuration: number;
  midiOutputDeviceId: string;
  midiInputDeviceId: string;
  monotimbral: boolean;
  debugMode: boolean;
}

function loadSettings(): Partial<StoredSettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveSettings(settings: StoredSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

export function Settings({ onStart }: SettingsProps) {
  const stored = loadSettings();
  const [tonic, setTonic] = useState<Tonic>(stored.tonic || 'C');
  const [numNotes, setNumNotes] = useState<number>(stored.numNotes || 10);
  const [stepDuration, setStepDuration] = useState<number>(stored.stepDuration || 3);
  const [ignoreOctaves, setIgnoreOctaves] = useState<boolean>(stored.ignoreOctaves ?? true);
  const [ignoreStepDuration, setIgnoreStepDuration] = useState<boolean>(stored.ignoreStepDuration ?? true);
  const [mode, setMode] = useState<SessionMode>(stored.mode || 'read-and-play');
  const [singHoldDuration, setSingHoldDuration] = useState<number>(stored.singHoldDuration ?? 1500);
  const [noteTransitionDelay, setNoteTransitionDelay] = useState<number>(stored.noteTransitionDelay ?? 500);
  const [tonalRetention, setTonalRetention] = useState<boolean>(stored.tonalRetention ?? true);
  const [tonalRetentionDuration, setTonalRetentionDuration] = useState<number>(stored.tonalRetentionDuration ?? 3);
  const [debugMode, setDebugMode] = useState<boolean>(stored.debugMode ?? false);

  const handleStart = () => {
    saveSettings({
      tonic, numNotes, stepDuration,
      audioMode: stored.audioMode || 'web-audio',
      midiProgram: stored.midiProgram || 0,
      selectedCategory: stored.selectedCategory || 'Piano',
      midiDroneProgram: stored.midiDroneProgram ?? 48,
      selectedDroneCategory: stored.selectedDroneCategory || 'Strings',
      ignoreOctaves, ignoreStepDuration, mode, singHoldDuration, noteTransitionDelay,
      sfNoteInstrument: stored.sfNoteInstrument || 'acoustic_grand_piano',
      sfNoteCategory: stored.sfNoteCategory || 'Piano',
      sfDroneInstrument: stored.sfDroneInstrument || 'string_ensemble_1',
      sfDroneCategory: stored.sfDroneCategory || 'Strings',
      tonalRetention, tonalRetentionDuration,
      midiOutputDeviceId: stored.midiOutputDeviceId || '',
      midiInputDeviceId: stored.midiInputDeviceId || '',
      monotimbral: stored.monotimbral ?? false,
      debugMode,
    });

    const audioMode = stored.audioMode || 'web-audio';
    onStart(
      { tonic, numNotes, stepDuration, ignoreOctaves, ignoreStepDuration, mode, singHoldDuration, noteTransitionDelay, tonalRetention, tonalRetentionDuration, debugMode },
      audioMode,
      audioMode === 'midi' ? stored.midiProgram : undefined,
      audioMode === 'midi' ? stored.midiDroneProgram : undefined,
      audioMode === 'soundfont' ? stored.sfNoteInstrument : undefined,
      audioMode === 'soundfont' ? stored.sfDroneInstrument : undefined,
      audioMode === 'midi' && stored.midiOutputDeviceId ? stored.midiOutputDeviceId : undefined,
      audioMode === 'midi' && stored.midiInputDeviceId ? stored.midiInputDeviceId : undefined,
      audioMode === 'midi' ? stored.monotimbral : undefined,
    );
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-slate-700" />
        <h2 className="text-2xl font-bold text-slate-800">Session Settings</h2>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Tonic (T)
          </label>
          <div className="relative w-96 h-96 mx-auto">
            {TONIC_GROUPS.map((group, index) => {
              const angle = (index * 360) / TONIC_GROUPS.length - 90;
              const radius = 140;
              const x = radius * Math.cos((angle * Math.PI) / 180);
              const y = radius * Math.sin((angle * Math.PI) / 180);

              if (group.length === 1) {
                return (
                  <button
                    key={group[0]}
                    onClick={() => setTonic(group[0])}
                    className={`absolute px-4 py-2 rounded-lg font-semibold transition-all transform -translate-x-1/2 -translate-y-1/2 ${
                      tonic === group[0]
                        ? 'bg-slate-800 text-white shadow-lg scale-110'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105'
                    }`}
                    style={{
                      left: `calc(50% + ${x}px)`,
                      top: `calc(50% + ${y}px)`,
                    }}
                  >
                    {group[0]}
                  </button>
                );
              }

              return (
                <div
                  key={group.join('-')}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                  }}
                >
                  <div className="flex flex-col gap-1">
                    {group.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTonic(t)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                          tonic === t
                            ? 'bg-slate-800 text-white shadow-lg scale-110'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:scale-105'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
              Circle of Fifths
            </div>
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg"
        >
          Start Session
        </button>

        <div>
          <label htmlFor="numNotes" className="block text-sm font-medium text-slate-700 mb-2">
            Number of Notes (N): {numNotes}
          </label>
          <input
            id="numNotes"
            type="range"
            min="5"
            max="50"
            step="5"
            value={numNotes}
            onChange={(e) => setNumNotes(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>5</span>
            <span>50</span>
          </div>
        </div>

        <fieldset className="border-2 border-slate-200 rounded-lg p-4 space-y-3">
          <legend className="text-sm font-medium text-slate-700 px-2">Octaves</legend>
          <p className="text-sm text-slate-600">
            Le note vengono generate su 3 ottave: ottava 3, 4 e 5.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreOctaves}
              onChange={(e) => setIgnoreOctaves(e.target.checked)}
              className="w-4 h-4 text-slate-800 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">Ignora Ottave</div>
              <div className="text-xs text-slate-500">Accetta la nota corretta in qualsiasi ottava</div>
            </div>
          </label>
        </fieldset>

        <fieldset className="border-2 border-slate-200 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 px-2">Tonal Retention</legend>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tonalRetention}
              onChange={(e) => setTonalRetention(e.target.checked)}
              className="w-4 h-4 text-slate-800 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">Drone continuo</div>
              <div className="text-xs text-slate-500">Il drone suona per tutta la durata dell'esercizio; se disattivato, si ferma dopo i secondi impostati</div>
            </div>
          </label>
          {!tonalRetention && (
            <div>
              <label htmlFor="tonalRetentionDuration" className="block text-sm text-slate-600 mb-2">
                Durata intro drone: {tonalRetentionDuration}s
              </label>
              <input
                id="tonalRetentionDuration"
                type="range"
                min="1"
                max="10"
                step="1"
                value={tonalRetentionDuration}
                onChange={(e) => setTonalRetentionDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1s</span>
                <span>10s</span>
              </div>
            </div>
          )}
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            Session Mode
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50">
              <input
                type="radio"
                name="mode"
                value="read-and-play"
                checked={mode === 'read-and-play'}
                onChange={(e) => setMode(e.target.value as SessionMode)}
                className="w-4 h-4 text-slate-800"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Leggi e Suona</div>
                <div className="text-sm text-slate-500">Il programma visualizza un grado, il tuo compito e' suonare la nota che corrisponde a quel grado nella tonalita' proposta</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50">
              <input
                type="radio"
                name="mode"
                value="read-and-speak"
                checked={mode === 'read-and-speak'}
                onChange={(e) => setMode(e.target.value as SessionMode)}
                className="w-4 h-4 text-slate-800"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Leggi e Parla</div>
                <div className="text-sm text-slate-500">Il programma visualizza un grado, il tuo compito e' dire ad alta voce il nome italiano della nota che corrisponde a quel grado nella tonalita' proposta. Il riconoscimento vocale verifica la risposta tenendo conto delle giuste diteggiature enarmoniche (diesis o bemolle a seconda della tonalita').</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50">
              <input
                type="radio"
                name="mode"
                value="read-and-sing"
                checked={mode === 'read-and-sing'}
                onChange={(e) => setMode(e.target.value as SessionMode)}
                className="w-4 h-4 text-slate-800"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Leggi e Canta</div>
                <div className="text-sm text-slate-500">Come Leggi e Suona, ma invece di suonare uno strumento MIDI, canti la nota nel microfono. Il programma rileva la frequenza della tua voce e verifica se corrisponde alla nota attesa.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50">
              <input
                type="radio"
                name="mode"
                value="listen-and-play"
                checked={mode === 'listen-and-play'}
                onChange={(e) => setMode(e.target.value as SessionMode)}
                className="w-4 h-4 text-slate-800"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Ascolta e Suona</div>
                <div className="text-sm text-slate-500">Avanzato. Il programma suona un drone che corrisponde alla tonalita' del pezzo e una nota che corrisponde ad un certo grado della tonalita' proposta. Il tuo compito e' quello di capire il grado e risolvere tale grado nella tonalita' proposta suonando la nota giusta sullo strumento. Attenzione, il programma rilevera' anche se sbagli l'ottava quindi se questo ti risultasse ancora difficile seleziona il checkbox Ignora Ottave.</div>
              </div>
            </label>
          </div>
        </div>

        {mode === 'read-and-speak' && (
          <div className="text-sm text-slate-600 bg-sky-50 border border-sky-200 rounded-lg p-4 space-y-2">
            <p className="font-medium text-slate-700">Nota:</p>
            <p>Il riconoscimento vocale richiede un browser compatibile (Chrome o Edge) e il permesso del microfono. Le risposte vengono valutate usando la nomenclatura italiana con le alterazioni corrette per la tonalita' scelta.</p>
            <p>Esempio: in tonalita' di <strong>Do</strong>, il grado <strong>2</strong> corrisponde a <strong>Re</strong>. In tonalita' di <strong>Re bemolle</strong>, il grado <strong>2</strong> corrisponde a <strong>Mib</strong> (non Mi).</p>
          </div>
        )}

        {mode === 'read-and-sing' && (
          <p className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
            La finestra di validazione della voce e' configurabile nella sezione Advanced.
          </p>
        )}

        <fieldset className="border-2 border-slate-200 rounded-lg p-4">
          <legend className="text-sm font-medium text-slate-700 px-2">Debug</legend>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              className="w-4 h-4 text-slate-800 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">Modalita' debug</div>
              <div className="text-xs text-slate-500">Mostra la risposta attesa sotto il grado da indovinare (in modalita' Leggi e Parla)</div>
            </div>
          </label>
        </fieldset>


      </div>
    </div>
  );
}
