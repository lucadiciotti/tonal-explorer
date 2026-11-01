export type Tonic = 'Ab' | 'Eb' | 'Bb' | 'F' | 'C' | 'G' | 'D' | 'A' | 'E' | 'B' | 'F#' | 'C#' | 'Db' | 'G#';

export type SessionMode = 'read-and-play' | 'listen-and-play' | 'read-and-sing';

export interface SessionSettings {
  tonic: Tonic;
  numNotes: number;
  stepDuration: number;
  ignoreOctaves: boolean;
  ignoreStepDuration: boolean;
  mode: SessionMode;
  singHoldDuration: number;
  noteTransitionDelay: number;
  tonalRetention: boolean;
  tonalRetentionDuration: number;
}

export interface Session {
  id: string;
  tonic: string;
  num_notes: number;
  step_duration: number;
  created_at: string;
  completed_at: string | null;
}

export type Note = string;

export interface SessionStats {
  maxHitStreak: number;
  minHitStreak: number;
  maxMissStreak: number;
  minMissStreak: number;
  reactionTime: ReactionTimeStats;
}

export interface ReactionTimeStats {
  mean: number;
  mode: number;
  min: number;
  max: number;
  count: number;
}

export interface ErrorLogEntry {
  stepIndex: number;
  drone: string;
  degree: string;
  expectedNote: string;
  sungNote: string;
}

export interface NoteResult {
  stepIndex: number;
  degree: string;
  expectedNote: string;
  playedNote: string | null;
  isCorrect: boolean;
  reactionTimeMs: number | null;
}
