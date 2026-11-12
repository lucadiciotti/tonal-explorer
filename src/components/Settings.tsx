import { useState } from 'react';
import { SessionSettings, Tonic, SessionMode } from '../types';
import { AudioRendererType } from '../lib/audio/AudioManager';
import { useI18n } from '../i18n/I18nContext';

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
  voiceAnnounceDegree: boolean;
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
  const { t } = useI18n();
  const [tonic, setTonic] = useState<Tonic>(stored.tonic || 'C');
  const [stepDuration, setStepDuration] = useState<number>(stored.stepDuration || 3);
  const [ignoreStepDuration, setIgnoreStepDuration] = useState<boolean>(stored.ignoreStepDuration ?? true);
  const [mode, setMode] = useState<SessionMode>(stored.mode || 'read-and-play');

  const handleStart = (selectedMode: SessionMode) => {
    setMode(selectedMode);
    saveSettings({
      tonic, numNotes: stored.numNotes || 10, stepDuration,
      audioMode: stored.audioMode || 'web-audio',
      midiProgram: stored.midiProgram || 0,
      selectedCategory: stored.selectedCategory || 'Piano',
      midiDroneProgram: stored.midiDroneProgram ?? 48,
      selectedDroneCategory: stored.selectedDroneCategory || 'Strings',
      ignoreOctaves: stored.ignoreOctaves ?? true, ignoreStepDuration, mode: selectedMode, singHoldDuration: stored.singHoldDuration ?? 1500, noteTransitionDelay: stored.noteTransitionDelay ?? 500,
      sfNoteInstrument: stored.sfNoteInstrument || 'acoustic_grand_piano',
      sfNoteCategory: stored.sfNoteCategory || 'Piano',
      sfDroneInstrument: stored.sfDroneInstrument || 'string_ensemble_1',
      sfDroneCategory: stored.sfDroneCategory || 'Strings',
      tonalRetention: stored.tonalRetention ?? true, tonalRetentionDuration: stored.tonalRetentionDuration ?? 3,
      midiOutputDeviceId: stored.midiOutputDeviceId || '',
      midiInputDeviceId: stored.midiInputDeviceId || '',
      monotimbral: stored.monotimbral ?? false,
      debugMode: stored.debugMode ?? false,
      voiceAnnounceDegree: stored.voiceAnnounceDegree ?? false,
    });

    const audioMode = stored.audioMode || 'web-audio';
    onStart(
      { tonic, numNotes: stored.numNotes || 10, stepDuration, ignoreOctaves: stored.ignoreOctaves ?? true, ignoreStepDuration, mode: selectedMode, singHoldDuration: stored.singHoldDuration ?? 1500, noteTransitionDelay: stored.noteTransitionDelay ?? 500, tonalRetention: stored.tonalRetention ?? true, tonalRetentionDuration: stored.tonalRetentionDuration ?? 3, debugMode: stored.debugMode ?? false, voiceAnnounceDegree: stored.voiceAnnounceDegree ?? false },
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
    <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            {t('tonic')}
          </label>
          <div className="relative w-72 h-72 sm:w-96 sm:h-96 mx-auto">
            {TONIC_GROUPS.map((group, index) => {
              const angle = (index * 360) / TONIC_GROUPS.length - 90;
              const radius = 108;
              const x = radius * Math.cos((angle * Math.PI) / 180);
              const y = radius * Math.sin((angle * Math.PI) / 180);

              if (group.length === 1) {
                return (
                  <button
                    key={group[0]}
                    onClick={() => setTonic(group[0])}
                    className={`absolute px-4 py-2 rounded-lg font-semibold transition-all transform -translate-x-1/2 -translate-y-1/2 ${
                      tonic === group[0]
                        ? 'bg-slate-800 dark:bg-sky-600 text-white shadow-lg scale-110'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105'
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
                            ? 'bg-slate-800 dark:bg-sky-600 text-white shadow-lg scale-110'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-105'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">
              {t('circleOfFifths')}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-3">
            {t('mode')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleStart('read-and-play')}
              className={`text-left p-4 border-2 rounded-lg transition-all hover:scale-[1.02] hover:shadow-md ${
                mode === 'read-and-play'
                  ? 'border-slate-800 dark:border-sky-500 bg-slate-50 dark:bg-sky-950'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-100">{t('modeReadPlay')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('modeReadPlayDesc')}</div>
            </button>

            <button
              onClick={() => handleStart('read-and-speak')}
              className={`text-left p-4 border-2 rounded-lg transition-all hover:scale-[1.02] hover:shadow-md ${
                mode === 'read-and-speak'
                  ? 'border-slate-800 dark:border-sky-500 bg-slate-50 dark:bg-sky-950'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-100">{t('modeReadSpeak')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('modeReadSpeakDesc')}</div>
            </button>

            <button
              onClick={() => handleStart('read-and-sing')}
              className={`text-left p-4 border-2 rounded-lg transition-all hover:scale-[1.02] hover:shadow-md ${
                mode === 'read-and-sing'
                  ? 'border-slate-800 dark:border-sky-500 bg-slate-50 dark:bg-sky-950'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-100">{t('modeReadSing')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('modeReadSingDesc')}</div>
            </button>

            <button
              onClick={() => handleStart('listen-and-play')}
              className={`text-left p-4 border-2 rounded-lg transition-all hover:scale-[1.02] hover:shadow-md ${
                mode === 'listen-and-play'
                  ? 'border-slate-800 dark:border-sky-500 bg-slate-50 dark:bg-sky-950'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="font-bold text-slate-800 dark:text-slate-100">{t('modeListenPlay')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('modeListenPlayDesc')}</div>
            </button>
          </div>
        </div>

        {mode === 'read-and-speak' && (
          <div className="text-sm text-slate-600 dark:text-slate-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg p-4 space-y-2">
            <p className="font-medium text-slate-700 dark:text-slate-200">{t('noteLabel')}</p>
            <p>{t('speechNoteDesc')}</p>
            <p>{t('speechNoteExample')} <strong>Do</strong>, {t('speechNoteDegree')} <strong>2</strong> {t('speechNoteCorresponds')} <strong>Re</strong>. {t('speechNoteExample')} <strong>Re bemolle</strong>, {t('speechNoteDegree')} <strong>2</strong> {t('speechNoteCorresponds')} <strong>Mib</strong> ({t('speechNoteNot')} Mi).</p>
            <p>{t('voiceAnnounceConfig')}</p>
          </div>
        )}

        {mode === 'read-and-sing' && (
          <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
            {t('singWindowConfig')}
          </p>
        )}

      </div>
    </div>
  );
}
