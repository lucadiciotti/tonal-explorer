/*
  # Add authentication to sessions table

  1. Changes
    - Add foreign key constraint on `user_id` column referencing `auth.users(id)`
    - Set `user_id` as NOT NULL with a default of `auth.uid()` so it auto-fills for authenticated users

  2. Security
    - Remove the old permissive public policy
    - Add 4 separate restrictive policies:
      - SELECT: Users can only view their own sessions
      - INSERT: Users can only create sessions for themselves
      - UPDATE: Users can only update their own sessions
      - DELETE: Users can only delete their own sessions
    - All policies require authentication and check ownership via `auth.uid()`

  3. Notes
    - Existing sessions without a user_id will become inaccessible (no user owns them)
    - This is intentional: we start fresh with authenticated sessions
    - The old public policy is dropped to enforce proper access control
*/

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Allow public access to sessions" ON sessions;

-- Add FK constraint and default value for user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'sessions_user_id_fkey'
    AND table_name = 'sessions'
  ) THEN
    ALTER TABLE sessions
      ALTER COLUMN user_id SET DEFAULT auth.uid(),
      ADD CONSTRAINT sessions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- SELECT: Users can view their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can create sessions for themselves
CREATE POLICY "Users can insert own sessions"
  ON sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
  ON sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
