import { useState, useEffect } from 'react';
import { ArrowLeft, SlidersHorizontal, Usb, Volume2, Sun, Moon, Monitor } from 'lucide-react';
import { MidiDetector, MidiDevice } from '../lib/audio/MidiDetector';
import { AudioRendererType } from '../lib/audio/AudioManager';
import { getProgramsByCategory, MIDI_PROGRAM_CATEGORIES } from '../lib/audio/MidiPrograms';
import { getSoundfontProgramsByCategory, SOUNDFONT_CATEGORIES } from '../lib/audio/SoundfontPrograms';
import { ThemeMode, getStoredTheme, saveTheme, applyTheme } from '../utils/theme';
import { useI18n } from '../i18n/I18nContext';

const STORAGE_KEY = 'mzt-settings';

interface StoredSettings {
  numNotes?: number;
  stepDuration?: number;
  ignoreStepDuration?: boolean;
  noteTransitionDelay?: number;
  singHoldDuration?: number;
  audioMode?: AudioRendererType;
  midiProgram?: number;
  selectedCategory?: string;
  midiDroneProgram?: number;
  selectedDroneCategory?: string;
  sfNoteInstrument?: string;
  sfNoteCategory?: string;
  sfDroneInstrument?: string;
  sfDroneCategory?: string;
  midiOutputDeviceId?: string;
  midiInputDeviceId?: string;
  monotimbral?: boolean;
  ignoreOctaves?: boolean;
  tonalRetention?: boolean;
  tonalRetentionDuration?: number;
  debugMode?: boolean;
  voiceAnnounceDegree?: boolean;
}

function loadSettings(): Partial<StoredSettings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePartial(partial: Partial<StoredSettings>): void {
  try {
    const existing = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...partial }));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

interface AdvancedSettingsProps {
  onBack: () => void;
}

export function AdvancedSettings({ onBack }: AdvancedSettingsProps) {
  const stored = loadSettings();
  const { t } = useI18n();
  const [numNotes, setNumNotes] = useState<number>(stored.numNotes ?? 10);
  const [stepDuration, setStepDuration] = useState<number>(stored.stepDuration ?? 3);
  const [ignoreStepDuration, setIgnoreStepDuration] = useState<boolean>(stored.ignoreStepDuration ?? true);
  const [noteTransitionDelay, setNoteTransitionDelay] = useState<number>(stored.noteTransitionDelay ?? 500);
  const [singHoldDuration, setSingHoldDuration] = useState<number>(stored.singHoldDuration ?? 1500);

  const [midiDevices, setMidiDevices] = useState<MidiDevice[]>([]);
  const [audioMode, setAudioMode] = useState<AudioRendererType>(stored.audioMode || 'web-audio');
  const [hasMidi, setHasMidi] = useState<boolean>(false);
  const [midiProgram, setMidiProgram] = useState<number>(stored.midiProgram || 0);
  const [selectedCategory, setSelectedCategory] = useState<string>(stored.selectedCategory || 'Piano');
  const [midiDroneProgram, setMidiDroneProgram] = useState<number>(stored.midiDroneProgram ?? 48);
  const [selectedDroneCategory, setSelectedDroneCategory] = useState<string>(stored.selectedDroneCategory || 'Strings');
  const [sfNoteInstrument, setSfNoteInstrument] = useState<string>(stored.sfNoteInstrument || 'acoustic_grand_piano');
  const [sfNoteCategory, setSfNoteCategory] = useState<string>(stored.sfNoteCategory || 'Piano');
  const [sfDroneInstrument, setSfDroneInstrument] = useState<string>(stored.sfDroneInstrument || 'string_ensemble_1');
  const [sfDroneCategory, setSfDroneCategory] = useState<string>(stored.sfDroneCategory || 'Strings');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(stored.midiOutputDeviceId || '');
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string>(stored.midiInputDeviceId || '');
  const [monotimbral, setMonotimbral] = useState<boolean>(stored.monotimbral ?? false);
  const [ignoreOctaves, setIgnoreOctaves] = useState<boolean>(stored.ignoreOctaves ?? true);
  const [tonalRetention, setTonalRetention] = useState<boolean>(stored.tonalRetention ?? true);
  const [tonalRetentionDuration, setTonalRetentionDuration] = useState<number>(stored.tonalRetentionDuration ?? 3);
  const [debugMode, setDebugMode] = useState<boolean>(stored.debugMode ?? false);
  const [voiceAnnounceDegree, setVoiceAnnounceDegree] = useState<boolean>(stored.voiceAnnounceDegree ?? false);
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme());

  const updateTheme = (value: ThemeMode) => {
    setTheme(value);
    saveTheme(value);
    applyTheme(value);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      const devices = await MidiDetector.getDevices();
      setMidiDevices(devices);
      setHasMidi(devices.length > 0);
      if (devices.length > 0 && !stored.audioMode) {
        setAudioMode('midi');
        savePartial({ audioMode: 'midi' });
      }

      unsubscribe = await MidiDetector.onDeviceChange((devices) => {
        setMidiDevices(devices);
        const available = devices.length > 0;
        setHasMidi(available);
        const newMode = available ? 'midi' : 'web-audio';
        setAudioMode(newMode);
        savePartial({ audioMode: newMode });
      });
    };
    init();

    return () => { unsubscribe?.(); };
  }, []);

  const updateNumNotes = (value: number) => {
    setNumNotes(value);
    savePartial({ numNotes: value });
  };

  const updateStepDuration = (value: number) => {
    setStepDuration(value);
    savePartial({ stepDuration: value });
  };

  const updateIgnoreStepDuration = (value: boolean) => {
    setIgnoreStepDuration(value);
    savePartial({ ignoreStepDuration: value });
  };

  const updateNoteTransitionDelay = (value: number) => {
    setNoteTransitionDelay(value);
    savePartial({ noteTransitionDelay: value });
  };

  const updateSingHoldDuration = (value: number) => {
    setSingHoldDuration(value);
    savePartial({ singHoldDuration: value });
  };

  const updateAudioMode = (value: AudioRendererType) => {
    setAudioMode(value);
    savePartial({ audioMode: value });
  };

  const updateMidiProgram = (value: number) => {
    setMidiProgram(value);
    savePartial({ midiProgram: value });
  };

  const updateSelectedCategory = (value: string) => {
    setSelectedCategory(value);
    savePartial({ selectedCategory: value });
    const programs = getProgramsByCategory(value);
    if (programs.length > 0) {
      setMidiProgram(programs[0].value);
      savePartial({ midiProgram: programs[0].value });
    }
  };

  const updateMidiDroneProgram = (value: number) => {
    setMidiDroneProgram(value);
    savePartial({ midiDroneProgram: value });
  };

  const updateSelectedDroneCategory = (value: string) => {
    setSelectedDroneCategory(value);
    savePartial({ selectedDroneCategory: value });
    const programs = getProgramsByCategory(value);
    if (programs.length > 0) {
      setMidiDroneProgram(programs[0].value);
      savePartial({ midiDroneProgram: programs[0].value });
    }
  };

  const updateSfNoteCategory = (value: string) => {
    setSfNoteCategory(value);
    savePartial({ sfNoteCategory: value });
    const programs = getSoundfontProgramsByCategory(value);
    if (programs.length > 0) {
      setSfNoteInstrument(programs[0].value);
      savePartial({ sfNoteInstrument: programs[0].value });
    }
  };

  const updateSfNoteInstrument = (value: string) => {
    setSfNoteInstrument(value);
    savePartial({ sfNoteInstrument: value });
  };

  const updateSfDroneCategory = (value: string) => {
    setSfDroneCategory(value);
    savePartial({ sfDroneCategory: value });
    const programs = getSoundfontProgramsByCategory(value);
    if (programs.length > 0) {
      setSfDroneInstrument(programs[0].value);
      savePartial({ sfDroneInstrument: programs[0].value });
    }
  };

  const updateSfDroneInstrument = (value: string) => {
    setSfDroneInstrument(value);
    savePartial({ sfDroneInstrument: value });
  };

  const updateSelectedDeviceId = (value: string) => {
    setSelectedDeviceId(value);
    savePartial({ midiOutputDeviceId: value });
  };

  const updateSelectedInputDeviceId = (value: string) => {
    setSelectedInputDeviceId(value);
    savePartial({ midiInputDeviceId: value });
  };

  const updateMonotimbral = (value: boolean) => {
    setMonotimbral(value);
    savePartial({ monotimbral: value });
  };

  const updateIgnoreOctaves = (value: boolean) => {
    setIgnoreOctaves(value);
    savePartial({ ignoreOctaves: value });
  };

  const updateTonalRetention = (value: boolean) => {
    setTonalRetention(value);
    savePartial({ tonalRetention: value });
  };

  const updateTonalRetentionDuration = (value: number) => {
    setTonalRetentionDuration(value);
    savePartial({ tonalRetentionDuration: value });
  };

  const updateDebugMode = (value: boolean) => {
    setDebugMode(value);
    savePartial({ debugMode: value });
  };

  const updateVoiceAnnounceDegree = (value: boolean) => {
    setVoiceAnnounceDegree(value);
    savePartial({ voiceAnnounceDegree: value });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <SlidersHorizontal className="w-6 h-6 text-slate-700 dark:text-slate-200" />
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('settings')}</h2>
      </div>

      <div className="space-y-6">
        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('numOfNotes')}</legend>
          <div>
            <label htmlFor="numNotes" className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
              N: {numNotes}
            </label>
            <input
              id="numNotes"
              type="range"
              min="5"
              max="50"
              step="5"
              value={numNotes}
              onChange={(e) => updateNumNotes(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-sky-500"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>5</span>
              <span>50</span>
            </div>
          </div>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">Tema</legend>
          <div className="grid grid-cols-3 gap-2">
            <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${theme === 'light' ? 'border-slate-800 bg-slate-50 dark:border-sky-500 dark:bg-sky-950' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
              <input type="radio" name="theme" value="light" checked={theme === 'light'} onChange={() => updateTheme('light')} className="sr-only" />
              <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('themeLight')}</span>
            </label>
            <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${theme === 'dark' ? 'border-slate-800 bg-slate-50 dark:border-sky-500 dark:bg-sky-950' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
              <input type="radio" name="theme" value="dark" checked={theme === 'dark'} onChange={() => updateTheme('dark')} className="sr-only" />
              <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('themeDark')}</span>
            </label>
            <label className={`flex flex-col items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors ${theme === 'auto' ? 'border-slate-800 bg-slate-50 dark:border-sky-500 dark:bg-sky-950' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
              <input type="radio" name="theme" value="auto" checked={theme === 'auto'} onChange={() => updateTheme('auto')} className="sr-only" />
              <Monitor className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('themeAuto')}</span>
            </label>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('themeAutoDesc')}
          </p>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('stepDuration')}</legend>
          <div>
            <label htmlFor="stepDuration" className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
              {t('durationP')} {stepDuration}s
            </label>
            <input
              id="stepDuration"
              type="range"
              min="1"
              max="10"
              step="1"
              value={stepDuration}
              onChange={(e) => updateStepDuration(Number(e.target.value))}
              disabled={ignoreStepDuration}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-sky-500 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>1s</span>
              <span>10s</span>
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreStepDuration}
              onChange={(e) => updateIgnoreStepDuration(e.target.checked)}
              className="w-4 h-4 text-slate-800 dark:text-slate-100 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('ignoreStepDuration')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('ignoreStepDurationDesc')}</div>
            </div>
          </label>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('pauseBetweenNotes')}</legend>
          <div>
            <label htmlFor="noteTransitionDelay" className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
              {t('pauseDuration')} {noteTransitionDelay}ms
            </label>
            <input
              id="noteTransitionDelay"
              type="range"
              min="0"
              max="1000"
              step="50"
              value={noteTransitionDelay}
              onChange={(e) => updateNoteTransitionDelay(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-sky-500"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>0ms</span>
              <span>1000ms</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('pauseDesc')}
          </p>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('voiceWindow')}</legend>
          <div>
            <label htmlFor="singHoldDuration" className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
              {t('pauseDuration')} {singHoldDuration}ms
            </label>
            <input
              id="singHoldDuration"
              type="range"
              min="500"
              max="3000"
              step="100"
              value={singHoldDuration}
              onChange={(e) => updateSingHoldDuration(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-sky-500"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>500ms</span>
              <span>3000ms</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('voiceWindowDesc')}
          </p>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('audioMidi')}</legend>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 has-[:checked]:border-slate-800 dark:has-[:checked]:border-sky-500 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-sky-950">
              <input
                type="radio"
                name="audioMode"
                value="web-audio"
                checked={audioMode === 'web-audio'}
                onChange={(e) => updateAudioMode(e.target.value as AudioRendererType)}
                className="w-4 h-4 text-slate-800 dark:text-slate-100"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">{t('webAudio')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('webAudioDesc')}</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 has-[:checked]:border-slate-800 dark:has-[:checked]:border-sky-500 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-sky-950 has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
              <input
                type="radio"
                name="audioMode"
                value="midi"
                checked={audioMode === 'midi'}
                onChange={(e) => updateAudioMode(e.target.value as AudioRendererType)}
                disabled={!hasMidi}
                className="w-4 h-4 text-slate-800 dark:text-slate-100"
              />
              <Usb className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              <div className="flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">
                  {t('midiDevice')}
                  {hasMidi && midiDevices.length > 0 && (
                    <span className="ml-2 text-xs text-green-600 font-normal">{t('midiConnected')}</span>
                  )}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {hasMidi && midiDevices.length > 0
                    ? midiDevices[0].name
                    : t('noMidiDevice')}
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 has-[:checked]:border-slate-800 dark:has-[:checked]:border-sky-500 has-[:checked]:bg-slate-50 dark:has-[:checked]:bg-sky-950">
              <input
                type="radio"
                name="audioMode"
                value="soundfont"
                checked={audioMode === 'soundfont'}
                onChange={(e) => updateAudioMode(e.target.value as AudioRendererType)}
                className="w-4 h-4 text-slate-800 dark:text-slate-100"
              />
              <Volume2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              <div className="flex-1">
                <div className="font-medium text-slate-800 dark:text-slate-100">{t('soundfont')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('soundfontDesc')}</div>
              </div>
            </label>
          </div>

          {audioMode === 'soundfont' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">{t('instrument')}</label>
                <div className="space-y-2">
                  <select
                    value={sfNoteCategory}
                    onChange={(e) => updateSfNoteCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                  >
                    {SOUNDFONT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={sfNoteInstrument}
                    onChange={(e) => updateSfNoteInstrument(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
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
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">{t('drone')}</label>
                <div className="space-y-2">
                  <select
                    value={sfDroneCategory}
                    onChange={(e) => updateSfDroneCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                  >
                    {SOUNDFONT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={sfDroneInstrument}
                    onChange={(e) => updateSfDroneInstrument(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
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
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">{t('midiOutput')}</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => updateSelectedDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                >
                  {midiDevices.filter(d => d.isOutput).length === 0 && (
                    <option value="">{t('noOutputDevice')}</option>
                  )}
                  {midiDevices.filter(d => d.isOutput).map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name}{device.manufacturer ? ` (${device.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('midiOutputDesc')}</p>
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">{t('midiInput')}</label>
                <select
                  value={selectedInputDeviceId}
                  onChange={(e) => updateSelectedInputDeviceId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                >
                  <option value="">{t('autoSameDevice')}</option>
                  {midiDevices.filter(d => d.isInput).map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name}{device.manufacturer ? ` (${device.manufacturer})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('midiInputDesc')}</p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer py-1">
                <input
                  type="checkbox"
                  checked={monotimbral}
                  onChange={(e) => updateMonotimbral(e.target.checked)}
                  className="w-4 h-4 text-slate-800 dark:text-slate-100 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('monotimbral')}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{t('monotimbralDesc')}</div>
                </div>
              </label>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">{monotimbral ? t('instrumentDroneNotes') : t('instrument')}</label>
                <div className="space-y-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => updateSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                  >
                    {MIDI_PROGRAM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={midiProgram}
                    onChange={(e) => updateMidiProgram(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                  >
                    {getProgramsByCategory(selectedCategory).map(prog => (
                      <option key={prog.value} value={prog.value}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!monotimbral && (
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-300 mb-2">{t('drone')}</label>
                <div className="space-y-2">
                  <select
                    value={selectedDroneCategory}
                    onChange={(e) => updateSelectedDroneCategory(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                  >
                    {MIDI_PROGRAM_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <select
                    value={midiDroneProgram}
                    onChange={(e) => updateMidiDroneProgram(Number(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-slate-800 dark:focus:border-sky-500 focus:outline-none text-sm"
                  >
                    {getProgramsByCategory(selectedDroneCategory).map(prog => (
                      <option key={prog.value} value={prog.value}>
                        {prog.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              )}
            </div>
          )}
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('octaves')}</legend>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('octavesDesc')}
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreOctaves}
              onChange={(e) => updateIgnoreOctaves(e.target.checked)}
              className="w-4 h-4 text-slate-800 dark:text-slate-100 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('ignoreOctaves')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('ignoreOctavesDesc')}</div>
            </div>
          </label>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('tonalRetention')}</legend>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tonalRetention}
              onChange={(e) => updateTonalRetention(e.target.checked)}
              className="w-4 h-4 text-slate-800 dark:text-slate-100 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('continuousDrone')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('continuousDroneDesc')}</div>
            </div>
          </label>
          {!tonalRetention && (
            <div>
              <label htmlFor="tonalRetentionDuration" className="block text-sm text-slate-600 dark:text-slate-300 mb-2">
                {t('droneIntroDuration')} {tonalRetentionDuration}s
              </label>
              <input
                id="tonalRetentionDuration"
                type="range"
                min="1"
                max="10"
                step="1"
                value={tonalRetentionDuration}
                onChange={(e) => updateTonalRetentionDuration(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-800 dark:accent-sky-500"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>1s</span>
                <span>10s</span>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('debug')}</legend>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => updateDebugMode(e.target.checked)}
              className="w-4 h-4 text-slate-800 dark:text-slate-100 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('debugMode')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('debugModeDesc')}</div>
            </div>
          </label>
        </fieldset>

        <fieldset className="border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 px-2">{t('voiceAnnounce')}</legend>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={voiceAnnounceDegree}
              onChange={(e) => updateVoiceAnnounceDegree(e.target.checked)}
              className="w-4 h-4 text-slate-800 dark:text-slate-100 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('voiceAnnounceEnabled')}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('voiceAnnounceDesc')}</div>
            </div>
          </label>
        </fieldset>
      </div>
    </div>
  );
}
