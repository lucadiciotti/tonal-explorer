import { useState } from 'react';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';

const STORAGE_KEY = 'mzt-settings';

interface StoredSettings {
  stepDuration?: number;
  ignoreStepDuration?: boolean;
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
  const [stepDuration, setStepDuration] = useState<number>(stored.stepDuration ?? 3);
  const [ignoreStepDuration, setIgnoreStepDuration] = useState<boolean>(stored.ignoreStepDuration ?? true);

  const updateStepDuration = (value: number) => {
    setStepDuration(value);
    savePartial({ stepDuration: value });
  };

  const updateIgnoreStepDuration = (value: boolean) => {
    setIgnoreStepDuration(value);
    savePartial({ ignoreStepDuration: value });
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <SlidersHorizontal className="w-6 h-6 text-slate-700" />
        <h2 className="text-2xl font-bold text-slate-800">Advanced</h2>
      </div>

      <div className="space-y-6">
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
              onChange={(e) => updateStepDuration(Number(e.target.value))}
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
              onChange={(e) => updateIgnoreStepDuration(e.target.checked)}
              className="w-4 h-4 text-slate-800 rounded"
            />
            <div>
              <div className="text-sm font-medium text-slate-800">Ignora Step Duration</div>
              <div className="text-xs text-slate-500">Nessun timeout, il sistema attende la nota</div>
            </div>
          </label>
        </fieldset>
      </div>
    </div>
  );
}
