/*
  # Add session results tracking

  1. Changes
    - Add `correct_notes` column to `sessions` table
      - Stores the number of correctly identified notes
      - Default value is 0
    - Add `total_notes` column to `sessions` table
      - Stores the total number of notes presented
      - Default value is 0
  
  2. Purpose
    - Track user performance in MIDI mode
    - Allow calculation of accuracy percentage
    - Enable historical performance analysis

  3. Notes
    - These columns are only populated when using MIDI input mode
    - In web audio mode, these will remain 0
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'correct_notes'
  ) THEN
    ALTER TABLE sessions ADD COLUMN correct_notes integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'total_notes'
  ) THEN
    ALTER TABLE sessions ADD COLUMN total_notes integer DEFAULT 0;
  END IF;
END $$;
