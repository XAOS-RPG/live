-- Supabase Schema Extension for GreekTorn Phase 2
-- Add every column that the frontend may attempt to send via saveProfileToCloud or createUserProfile
-- This ensures the database accepts the entire game state without PGRST204 errors.

-- 1. Add columns that are present in playerStore.getSerializable() but missing from the profiles table

-- regenAccumulators: JSON object with hp, energy, nerve, happiness accumulators
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regen_accumulators JSONB DEFAULT '{"hp":0, "energy":0, "nerve":0, "happiness":0}'::jsonb;

-- activeActivity: nullable JSON object representing the current activity
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_activity JSONB DEFAULT NULL;

-- pendingResult: nullable JSON object for pending activity result
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_result JSONB DEFAULT NULL;

-- lastTick: timestamp of the last game tick (milliseconds since epoch)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_tick BIGINT DEFAULT 0;

-- createdAt: timestamp of character creation (milliseconds since epoch, already exists as created_at TIMESTAMPTZ)
-- We'll keep both; add a numeric version if needed for compatibility
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at_ms BIGINT DEFAULT 0;

-- activityLog: array of activity entries
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure any camelCase variants that may be sent are also accepted
-- crimeXP (camelCase) is already mapped to crime_xp in the frontend, but add both for safety
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crime_xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crimeXP INTEGER DEFAULT 0;

-- statusTimerEnd (camelCase) vs status_timer_end
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_timer_end TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS statustimerend TIMESTAMPTZ DEFAULT NULL;

-- 3. Add any other potential top‑level keys from other stores (if they ever get merged)
-- These are not currently saved, but we add them to be future‑proof

-- inventory (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb;

-- crimes (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crimes JSONB DEFAULT '{}'::jsonb;

-- combat (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS combat JSONB DEFAULT '{}'::jsonb;

-- jobs (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS jobs JSONB DEFAULT '{}'::jsonb;

-- properties (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;

-- travel (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel JSONB DEFAULT '{}'::jsonb;

-- education (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '{}'::jsonb;

-- casino (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casino JSONB DEFAULT '{}'::jsonb;

-- stocks (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stocks JSONB DEFAULT '{}'::jsonb;

-- dailyReward (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_reward JSONB DEFAULT '{}'::jsonb;

-- achievements (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '{}'::jsonb;

-- missions (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS missions JSONB DEFAULT '{}'::jsonb;

-- faction (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faction JSONB DEFAULT '{}'::jsonb;

-- bazaar (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bazaar JSONB DEFAULT '{}'::jsonb;

-- company (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company JSONB DEFAULT '{}'::jsonb;

-- bounty (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bounty JSONB DEFAULT '{}'::jsonb;

-- racing (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS racing JSONB DEFAULT '{}'::jsonb;

-- eventsHub (JSONB)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS events_hub JSONB DEFAULT '{}'::jsonb;

-- 4. Ensure the `username` column is present and unique (already defined, but enforce)
-- (No action needed, column already exists with UNIQUE NOT NULL)

-- 5. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 6. Optional: Verify the table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
-- ORDER BY ordinal_position;

COMMENT ON TABLE public.profiles IS 'GreekTorn player profiles – extended to accept full game state JSON.';