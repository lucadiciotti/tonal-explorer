/*
# Add user profiles table with admin role support

1. New Tables
  - `profiles` (1:1 with auth.users)
    - `id` (uuid, PK, FK -> auth.users ON DELETE CASCADE)
    - `email` (text) — replicated from auth.users for lightweight queries
    - `role` (text, NOT NULL, DEFAULT 'user') — 'user' or 'admin'
    - `created_at` (timestamptz, DEFAULT now())

2. New Functions
  - `public.is_admin()` — returns true if the current JWT has role='admin' in app_metadata.
    Uses auth.jwt() app_metadata (server-controlled, user-immutable). Granted to authenticated.
  - `public.handle_new_user()` — SECURITY DEFINER trigger function that auto-creates
    a profile row on signup. Trigger `on_auth_user_created` on auth.users after INSERT.

3. Security
  - RLS enabled on `profiles`.
  - GRANT SELECT to authenticated (no INSERT/UPDATE/DELETE via Data API —
    profiles are created by the trigger and managed via SQL).
  - SELECT policy: users read their own profile; admins read all profiles.
  - Additional admin SELECT policies on `sessions` and `session_notes`:
    admins can read ALL rows (all users); regular users unchanged (own rows only).
  - `is_admin()` revokes EXECUTE from PUBLIC/anon, grants to authenticated only.
  - `handle_new_user()` revokes EXECUTE from PUBLIC/anon (trigger-only).

4. Notes
  - Existing auth.users are backfilled with profile rows in this migration.
  - Admin promotion is done via SQL on auth.users.app_metadata + profiles.role.
  - The is_admin() helper avoids subqueries in every policy check.
*/

-- ============================================================
-- 1. Create profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;

-- ============================================================
-- 2. is_admin() helper function
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ============================================================
-- 3. Profiles RLS policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 4. Auto-create profile on signup (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. Backfill profiles for existing users
-- ============================================================
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);

-- ============================================================
-- 6. Admin SELECT policies on sessions and session_notes
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all session notes" ON session_notes;
CREATE POLICY "Admins can view all session notes"
  ON session_notes FOR SELECT
  TO authenticated
  USING (public.is_admin());
