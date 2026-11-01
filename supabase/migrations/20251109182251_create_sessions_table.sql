/*
  # Create sessions table for MZT music training app

  1. New Tables
    - `sessions`
      - `id` (uuid, primary key) - Unique session identifier
      - `user_id` (uuid) - Reference to auth.users for future auth integration
      - `tonic` (text) - Tonic note in Anglo-Saxon notation (A, B, C, D, E, F, G)
      - `num_notes` (integer) - Number of notes to display (N)
      - `step_duration` (integer) - Time between notes in seconds (P)
      - `created_at` (timestamptz) - Session creation timestamp
      - `completed_at` (timestamptz, nullable) - Session completion timestamp
  
  2. Security
    - Enable RLS on `sessions` table
    - Add policy for public access (no auth required for now)
  
  3. Notes
    - Sessions store configuration for music training exercises
    - Each session tracks when it was started and optionally when completed
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  tonic text NOT NULL,
  num_notes integer NOT NULL DEFAULT 10,
  step_duration integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access to sessions"
  ON sessions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);