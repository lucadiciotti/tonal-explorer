/*
  # Add session config columns and create session_notes table

  1. Modified Tables
    - `sessions`
      - `mode` (text) - Session mode: read-and-play, listen-and-play, read-and-sing
      - `ignore_octaves` (boolean) - Whether octave matching was disabled
      - `ignore_step_duration` (boolean) - Whether the timer was disabled (free time)
      - `sing_hold_duration` (integer) - Hold duration in ms for read-and-sing mode
      - `note_transition_delay` (integer) - Pause between notes in ms

  2. New Tables
    - `session_notes` - One row per note in a session, storing the raw result
      - `id` (uuid, primary key)
      - `session_id` (uuid, FK to sessions)
      - `user_id` (uuid, FK to auth.users)
      - `step_index` (integer) - Position in the sequence (0-based)
      - `degree` (text) - Scale degree shown (e.g. "3", "b7", "^1", "_5")
      - `expected_note` (text) - Expected note with octave (e.g. "E4")
      - `played_note` (text, nullable) - Actual note played/sung, null if timeout
      - `is_correct` (boolean) - Whether the answer was correct
      - `reaction_time_ms` (real, nullable) - Milliseconds from presentation to response
      - `created_at` (timestamptz) - Timestamp

  3. Security
    - Enable RLS on `session_notes`
    - SELECT/INSERT/UPDATE/DELETE policies restricted to authenticated owner
    - session_notes.user_id checked against auth.uid()

  4. Notes
    - All new columns on sessions use defaults so existing rows are unaffected
    - session_notes allows granular analysis: per-degree accuracy, reaction trends, etc.
    - Aggregate stats (streaks, averages) can be computed from session_notes at query time
*/

-- Add new config columns to sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'mode'
  ) THEN
    ALTER TABLE sessions ADD COLUMN mode text NOT NULL DEFAULT 'read-and-play';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ignore_octaves'
  ) THEN
    ALTER TABLE sessions ADD COLUMN ignore_octaves boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ignore_step_duration'
  ) THEN
    ALTER TABLE sessions ADD COLUMN ignore_step_duration boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'sing_hold_duration'
  ) THEN
    ALTER TABLE sessions ADD COLUMN sing_hold_duration integer NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'note_transition_delay'
  ) THEN
    ALTER TABLE sessions ADD COLUMN note_transition_delay integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Create session_notes table
CREATE TABLE IF NOT EXISTS session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  step_index integer NOT NULL,
  degree text NOT NULL,
  expected_note text NOT NULL,
  played_note text,
  is_correct boolean NOT NULL DEFAULT false,
  reaction_time_ms real,
  created_at timestamptz DEFAULT now()
);

-- Index for querying notes by session
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes(session_id);

-- Index for querying a user's notes across sessions (for stats)
CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON session_notes(user_id);

-- Enable RLS
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own session notes
CREATE POLICY "Users can view own session notes"
  ON session_notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can insert their own session notes
CREATE POLICY "Users can insert own session notes"
  ON session_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own session notes
CREATE POLICY "Users can update own session notes"
  ON session_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own session notes
CREATE POLICY "Users can delete own session notes"
  ON session_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
