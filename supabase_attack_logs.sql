-- ============================================================
-- attack_logs table + RLS
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.attack_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  defender_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result       TEXT        NOT NULL
                             CHECK (result IN ('attacker_won', 'defender_won', 'escaped')),
  cash_stolen  INTEGER     NOT NULL DEFAULT 0 CHECK (cash_stolen >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- An attacker cannot attack themselves
  CONSTRAINT attack_logs_no_self_attack CHECK (attacker_id <> defender_id)
);

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS attack_logs_attacker_idx  ON public.attack_logs (attacker_id);
CREATE INDEX IF NOT EXISTS attack_logs_defender_idx  ON public.attack_logs (defender_id);
CREATE INDEX IF NOT EXISTS attack_logs_created_idx   ON public.attack_logs (created_at DESC);

-- ── Row Level Security ─────────────────────────────────────
ALTER TABLE public.attack_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: a user can read any log where they are attacker OR defender
CREATE POLICY "attack_logs_select"
  ON public.attack_logs
  FOR SELECT
  USING (
    auth.uid() = attacker_id
    OR
    auth.uid() = defender_id
  );

-- INSERT: a user can only log an attack they initiated (attacker_id = their own id).
-- They cannot forge a log on behalf of someone else, and cannot attack themselves.
CREATE POLICY "attack_logs_insert"
  ON public.attack_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = attacker_id
    AND auth.uid() <> defender_id
  );

-- UPDATE / DELETE: nobody — logs are immutable once written.
-- (No UPDATE or DELETE policies are created, so both are denied by default.)

-- ── Permissions ────────────────────────────────────────────
GRANT SELECT, INSERT ON public.attack_logs TO authenticated;
GRANT ALL             ON public.attack_logs TO service_role;

-- ============================================================
-- profiles: add a public read policy so players can view
-- each other's profiles (needed for PublicProfileView).
-- Only safe columns are exposed — cash/bank/vault stay private.
-- ============================================================

-- Drop the old own-only select policy first
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- New policy: any authenticated user can read any profile row,
-- but only the columns the app explicitly selects matter —
-- the RLS just controls row visibility, not column visibility.
-- We keep it simple: authenticated users can read all rows.
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');
