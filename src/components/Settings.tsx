import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Usb, Volume2 } from 'lucide-react';
import { SessionSettings, Tonic, SessionMode } from '../types';
import { MidiDetector, MidiDevice } from '../lib/audio/MidiDetector';
import { AudioRendererType } from '../lib/audio/AudioManager';
import { getProgramsByCategory, MIDI_PROGRAM_CATEGORIES } from '../lib/audio/MidiPrograms';
import { getSoundfontProgramsByCategory, SOUNDFONT_CATEGORIES } from '../lib/audio/SoundfontPrograms';

interface SettingsProps {
  onStart: (settings: SessionSettings, rendererType: AudioRendererType, midiProgram?: number, midiDroneProgram?: number, soundfontNote?: string, soundfontDrone?: string, midiOutputDeviceId?: string, midiInputDeviceId?: string) => void;
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
  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [audioMode, setAudioMode] = useState<AudioRendererType>(stored.audioMode || 'web-audio');
  const [hasMidi, setHasMidi] = useState<boolean>(false);
  const [midiProgram, setMidiProgram] = useState<number>(stored.midiProgram || 0);
  const [selectedCategory, setSelectedCategory] = useState<string>(stored.selectedCategory || 'Piano');
  const [midiDroneProgram, setMidiDroneProgram] = useState<number>(stored.midiDroneProgram ?? 48);
  const [selectedDroneCategory, setSelectedDroneCategory] = useState<string>(stored.selectedDroneCategory || 'Strings');
  const [ignoreOctaves, setIgnoreOctaves] = useState<boolean>(stored.ignoreOctaves ?? true);
  const [ignoreStepDuration, setIgnoreStepDuration] = useState<boolean>(stored.ignoreStepDuration ?? false);
  const [mode, setMode] = useState<SessionMode>(stored.mode || 'read-and-play');
  const [singHoldDuration, setSingHoldDuration] = useState<number>(stored.singHoldDuration ?? 1500);
  const [noteTransitionDelay, setNoteTransitionDelay] = useState<number>(stored.noteTransitionDelay ?? 500);
  const [sfNoteInstrument, setSfNoteInstrument] = useState<string>(stored.sfNoteInstrument || 'acoustic_grand_piano');
  const [sfNoteCategory, setSfNoteCategory] = useState<string>(stored.sfNoteCategory || 'Piano');
  const [sfDroneInstrument, setSfDroneInstrument] = useState<string>(stored.sfDroneInstrument || 'string_ensemble_1');
  const [sfDroneCategory, setSfDroneCategory] = useState<string>(stored.sfDroneCategory || 'Strings');
  const [tonalRetention, setTonalRetention] = useState<boolean>(stored.tonalRetention ?? true);
  const [tonalRetentionDuration, setTonalRetentionDuration] = useState<number>(stored.tonalRetentionDuration ?? 3);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(stored.midiOutputDeviceId || '');
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string>(stored.midiInputDeviceId || '');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const devices = await MidiDetector.getDevices();
      setMidiDevices(devices);
      setHasMidi(devices.length > 0);
      if (devices.length > 0 && !stored.audioMode) {
        setAudioMode('midi');
      }

      unsubscribe = await MidiDetector.onDeviceChange((devices) => {
        setMidiDevices(devices);
        const available = devices.length > 0;
        setHasMidi(available);
        setAudioMode(available ? 'midi' : 'web-audio');
      });
    };
    init();

    return () => { unsubscribe?.(); };
  }, []);

  const handleStart = () => {
    saveSettings({ tonic, numNotes, stepDuration, audioMode, midiProgram, selectedCategory, midiDroneProgram, selectedDroneCategory, ignoreOctaves, ignoreStepDuration, mode, singHoldDuration, noteTransitionDelay, sfNoteInstrument, sfNoteCategory, sfDroneInstrument, sfDroneCategory, tonalRetention, tonalRetentionDuration, midiOutputDeviceId: selectedDeviceId, midiInputDeviceId: selectedInputDeviceId });
    onStart(
      { tonic, numNotes, stepDuration, ignoreOctaves, ignoreStepDuration, mode, singHoldDuration, noteTransitionDelay, tonalRetention, tonalRetentionDuration },
      audioMode,
      audioMode === 'midi' ? midiProgram : undefined,
      audioMode === 'midi' ? midiDroneProgram : undefined,
      audioMode === 'soundfont' ? sfNoteInstrument : undefined,
      audioMode === 'soundfont' ? sfDroneInstrument : undefined,
      audioMode === 'midi' && selectedDeviceId ? selectedDeviceId : undefined,
      audioMode === 'midi' && selectedInputDeviceId ? selectedInputDeviceId : undefined,
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
          <legend className="text-sm font-medium text-slate-700 px-2">Step Duration</legend>
          <div>
            <label htmlFor="stepDuration" className="block text-sm text-slate-600 mb-2">
              Duration (P): {stepDuration}s
            </label>
            <input
              id="stepDuration"
              type="range"
              min="1"
              max="10"
              step="1"
              value={stepDuration}
              onChange={(e) => setStepDuration(Number(e.target.value))}
              disabled={ignoreStepDuration}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1s</span>
              <span>10s</span>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreStepDuration}
              onChange={(e) => setIgnoreStepDuration(e.target.checked)}
              className="w-4 h-4 text-slate-800 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">Ignora Step Duration</div>
              <div className="text-xs text-slate-500">Nessun timeout, il sistema attende la nota</div>
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

        <fieldset className="border-2 border-slate-200 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 px-2">Pausa tra le note</legend>
          <div>
            <label htmlFor="noteTransitionDelay" className="block text-sm text-slate-600 mb-2">
              Durata: {noteTransitionDelay}ms
            </label>
            <input
              id="noteTransitionDelay"
              type="range"
              min="0"
              max="1000"
              step="50"
              value={noteTransitionDelay}
              onChange={(e) => setNoteTransitionDelay(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>0ms</span>
              <span>1000ms</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Tempo di attesa dopo una risposta corretta (o dopo lo scadere del timer) prima di presentare la nota successiva. Un valore piu' alto lascia piu' tempo per assimilare il feedback visivo; 0 rende la transizione istantanea.
          </p>
        </fieldset>

        <fieldset className="border-2 border-slate-200 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 px-2">Audio / MIDI</legend>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50">
              <input
                type="radio"
                name="audioMode"
                value="web-audio"
                checked={audioMode === 'web-audio'}
                onChange={(e) => setAudioMode(e.target.value as AudioRendererType)}
                className="w-4 h-4 text-slate-800"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Web Audio</div>
                <div className="text-xs text-slate-500">Built-in synthesizer</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50 has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
              <input
                type="radio"
                name="audioMode"
                value="midi"
                checked={audioMode === 'midi'}
                onChange={(e) => setAudioMode(e.target.value as AudioRendererType)}
                disabled={!hasMidi}
                className="w-4 h-4 text-slate-800"
              />
              <Usb className="w-5 h-5 text-slate-600" />
              <div className="flex-1">
                <div className="font-medium text-slate-800">
                  MIDI Device
                  {hasMidi && midiDevices.length > 0 && (
                    <span className="ml-2 text-xs text-green-600 font-normal">Connected</span>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {hasMidi && midiDevices.length > 0
                    ? midiDevices[0].name
                    : 'No MIDI device detected'}
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 has-[:checked]:border-slate-800 has-[:checked]:bg-slate-50">
              <input
                type="radio"
                name="audioMode"
                value="soundfont"
                checked={audioMode === 'soundfont'}
                onChange={(e) => setAudioMode(e.target.value as AudioRendererType)}
                className="w-4 h-4 text-slate-800"
              />
              <Volume2 className="w-5 h-5 text-slate-600" />
              <div className="flex-1">
                <div className="font-medium text-slate-800">Soundfont</div>
                <div className="text-xs text-slate-500">Strumenti realistici nel browser (richiede download campioni)</div>
              </div>
            </label>
          </div>

          {audioMode === 'soundfont' && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-sm text-slate-600 mb-2">Instrument</label>
                <div className="space-y-2">
                  <select
                    value={sfNoteCategory}
                    onChange={(e) => {
                      setSfNoteCategory(e.target.value);
                      const programs = getSoundfontProgramsByCategory(e.target.value);
                      if (programs.length > 0) {
                        setSfNoteInstrument(programs[0].value);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {SOUNDFONT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={sfNoteInstrument}
                    onChange={(e) => setSfNoteInstrument(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {getSoundfontProgramsByCategory(sfNoteCategory).map(prog => (
                      <option key={prog.value} value={prog.value}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Drone</label>
                <div className="space-y-2">
                  <select
                    value={sfDroneCategory}
                    onChange={(e) => {
                      setSfDroneCategory(e.target.value);
                      const programs = getSoundfontProgramsByCategory(e.target.value);
                      if (programs.length > 0) {
                        setSfDroneInstrument(programs[0].value);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {SOUNDFONT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={sfDroneInstrument}
                    onChange={(e) => setSfDroneInstrument(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {getSoundfontProgramsByCategory(sfDroneCategory).map(prog => (
                      <option key={prog.value} value={prog.value}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {audioMode === 'midi' && hasMidi && (
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-sm text-slate-600 mb-2">Sintetizzatore MIDI (output)</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                >
                  {midiDevices.filter(d => d.isOutput).length === 0 && (
                    <option value="">Nessun dispositivo output</option>
                  )}
                  {midiDevices.filter(d => d.isOutput).map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name}{device.manufacturer ? ` (${device.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">Il dispositivo che produce il suono (drone e note di riferimento)</p>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Tastiera MIDI (input)</label>
                <select
                  value={selectedInputDeviceId}
                  onChange={(e) => setSelectedInputDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                >
                  <option value="">Auto (stesso dispositivo output)</option>
                  {midiDevices.filter(d => d.isInput).map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name}{device.manufacturer ? ` (${device.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">La tastiera che suoni per rispondere agli esercizi</p>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Instrument</label>
                <div className="space-y-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      const programs = getProgramsByCategory(e.target.value);
                      if (programs.length > 0) {
                        setMidiProgram(programs[0].value);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {MIDI_PROGRAM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={midiProgram}
                    onChange={(e) => setMidiProgram(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {getProgramsByCategory(selectedCategory).map(prog => (
                      <option key={prog.value} value={prog.value}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-2">Drone</label>
                <div className="space-y-2">
                  <select
                    value={selectedDroneCategory}
                    onChange={(e) => {
                      setSelectedDroneCategory(e.target.value);
                      const programs = getProgramsByCategory(e.target.value);
                      if (programs.length > 0) {
                        setMidiDroneProgram(programs[0].value);
                      }
                    }}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {MIDI_PROGRAM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={midiDroneProgram}
                    onChange={(e) => setMidiDroneProgram(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-slate-800 focus:outline-none text-sm"
                  >
                    {getProgramsByCategory(selectedDroneCategory).map(prog => (
                      <option key={prog.value} value={prog.value}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>
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
          </div>
        </div>

        {mode === 'read-and-sing' && (
          <fieldset className="border-2 border-slate-200 rounded-lg p-4 space-y-4">
            <legend className="text-sm font-medium text-slate-700 px-2">Voce</legend>
            <div>
              <label htmlFor="singHoldDuration" className="block text-sm text-slate-600 mb-2">
                Finestra di validazione: {singHoldDuration}ms
              </label>
              <input
                id="singHoldDuration"
                type="range"
                min="500"
                max="3000"
                step="100"
                value={singHoldDuration}
                onChange={(e) => setSingHoldDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>500ms</span>
                <span>3000ms</span>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Per evitare falsi positivi, la nota cantata viene accettata solo se mantenuta stabile per tutta la durata della finestra di validazione. Un valore piu' basso rende la risposta piu' reattiva ma aumenta il rischio di errori involontari; un valore piu' alto richiede maggiore costanza ma garantisce un riconoscimento piu' affidabile.
            </p>
          </fieldset>
        )}


      </div>
    </div>
  );
}
