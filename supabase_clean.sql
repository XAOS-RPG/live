-- ============================================================
-- CLEAN PROFILES SCHEMA — Cloud-Only Save System
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 0. Drop dependent views first
DROP VIEW IF EXISTS public.friends_with_profiles CASCADE;

-- 1. Drop old cluttered columns, keep only what's needed
--    (save_data JSONB is the single source of truth for all game state)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS xp,
  DROP COLUMN IF EXISTS cash,
  DROP COLUMN IF EXISTS bank,
  DROP COLUMN IF EXISTS vault,
  DROP COLUMN IF EXISTS filotimo,
  DROP COLUMN IF EXISTS meson,
  DROP COLUMN IF EXISTS crime_xp,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS status_timer_end,
  DROP COLUMN IF EXISTS stats,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS regen_accumulators,
  DROP COLUMN IF EXISTS active_activity,
  DROP COLUMN IF EXISTS pending_result,
  DROP COLUMN IF EXISTS last_tick,
  DROP COLUMN IF EXISTS created_at_ms,
  DROP COLUMN IF EXISTS activity_log,
  DROP COLUMN IF EXISTS inventory,
  DROP COLUMN IF EXISTS crimes,
  DROP COLUMN IF EXISTS combat,
  DROP COLUMN IF EXISTS jobs,
  DROP COLUMN IF EXISTS properties,
  DROP COLUMN IF EXISTS travel,
  DROP COLUMN IF EXISTS education,
  DROP COLUMN IF EXISTS casino,
  DROP COLUMN IF EXISTS stocks,
  DROP COLUMN IF EXISTS daily_reward,
  DROP COLUMN IF EXISTS achievements,
  DROP COLUMN IF EXISTS missions,
  DROP COLUMN IF EXISTS faction,
  DROP COLUMN IF EXISTS bazaar,
  DROP COLUMN IF EXISTS company,
  DROP COLUMN IF EXISTS bounty,
  DROP COLUMN IF EXISTS racing,
  DROP COLUMN IF EXISTS events_hub;

-- 2. Ensure save_data column exists (in case it wasn't added yet)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS save_data JSONB DEFAULT NULL;

-- 3. Final schema: profiles(id, username, save_data, created_at, updated_at)
--    If starting fresh, use this instead of the ALTER above:
-- CREATE TABLE IF NOT EXISTS public.profiles (
--   id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
--   username TEXT UNIQUE NOT NULL,
--   save_data JSONB DEFAULT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- 4. RLS policies (drop and recreate to be safe)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Index on updated_at for sync queries
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at);

-- 7. Permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
