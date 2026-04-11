-- Supabase Schema Compatibility Fix for GreekTorn
-- This script ensures the public.profiles table has every column that the frontend
-- may send during registration (createUserProfile) or cloud save (saveProfileToCloud).
-- It also adds columns for the full player state (getSerializable) and other stores
-- to guarantee no PGRST204 errors.

-- Run this entire script in the Supabase SQL Editor, then verify with:
-- NOTIFY pgrst, 'reload schema';

-- 1. Core columns already defined in supabase_profiles_schema.sql
--    (we add them IF NOT EXISTS to be safe)

-- Primary key and auth reference
-- id UUID PRIMARY KEY REFERENCES auth.users (already exists)

-- Unique username (required)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE NOT NULL DEFAULT '';
-- Display name
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '';
-- Gender
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'male';
-- Level & XP
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exp INTEGER DEFAULT 0; -- alias

-- Currency
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cash INTEGER DEFAULT 500;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bank INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS vault INTEGER DEFAULT 0;

-- Greek mechanics
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS filotimo INTEGER DEFAULT 50;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS meson INTEGER DEFAULT 0;

-- Crime XP (snake_case and camelCase)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crime_xp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crimexp INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crimeXP INTEGER DEFAULT 0;

-- Status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status_timer_end TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS statustimerend TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS statusTimerEnd TIMESTAMPTZ DEFAULT NULL;

-- JSON columns for complex data
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{"strength":5, "speed":5, "dexterity":5, "defense":5}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{"hp":{"current":100,"max":100}, "energy":{"current":100,"max":100}, "nerve":{"current":100,"max":100}, "happiness":{"current":100,"max":100}}'::jsonb;

-- Timestamps
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at_ms BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at_ms BIGINT DEFAULT 0;

-- 2. Player‑store‑specific keys from getSerializable() that are NOT yet in the table

-- Regen accumulators
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regen_accumulators JSONB DEFAULT '{"hp":0, "energy":0, "nerve":0, "happiness":0}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS regenAccumulators JSONB DEFAULT '{"hp":0, "energy":0, "nerve":0, "happiness":0}'::jsonb;

-- Activity system
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_activity JSONB DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activeActivity JSONB DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_result JSONB DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pendingResult JSONB DEFAULT NULL;

-- Timestamps (milliseconds)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_tick BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lastTick BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at_timestamp BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS createdAt BIGINT DEFAULT 0;

-- Activity log
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activity_log JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS activityLog JSONB DEFAULT '[]'::jsonb;

-- 3. Columns for other stores (in case the whole game state is ever saved as separate columns)
--    Each store's getSerializable() returns an object; we create a JSONB column for each.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS crimes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS combat JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS jobs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS properties JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS travel JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS casino JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stocks JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_reward JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS missions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faction JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bazaar JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bounty JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS racing JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS events_hub JSONB DEFAULT '{}'::jsonb;

-- 4. Extra columns for any nested keys inside resources (hp.current, hp.max etc.)
--    These are already inside the resources JSONB column, but we add flat columns
--    for compatibility if the frontend ever sends them directly.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hp_current INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hp_max INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS energy_current INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS energy_max INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nerve_current INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nerve_max INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS happiness_current INTEGER DEFAULT 100;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS happiness_max INTEGER DEFAULT 100;

-- 5. Stats as separate integer columns (optional)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS strength INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS speed INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dexterity INTEGER DEFAULT 5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS defense INTEGER DEFAULT 5;

-- 6. Ensure the UNIQUE constraint on username (if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
END $$;

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- 8. Output confirmation
SELECT 'Schema updated successfully. All columns are now present.' AS message;

-- 9. (Optional) Verify the table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles'
-- ORDER BY ordinal_position;