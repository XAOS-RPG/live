-- Supabase SQL Script for GreekTorn Phase 2: Profiles Table
-- Run this in the Supabase SQL Editor to create the required schema and policies.

-- 1. Create the profiles table with core player state columns
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT '',
  gender TEXT DEFAULT 'male',
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  cash INTEGER DEFAULT 500,
  bank INTEGER DEFAULT 0,
  vault INTEGER DEFAULT 0,
  filotimo INTEGER DEFAULT 50,
  meson INTEGER DEFAULT 0,
  crime_xp INTEGER DEFAULT 0,
  status TEXT DEFAULT 'free',
  status_timer_end TIMESTAMPTZ,
  stats JSONB DEFAULT '{"strength":5, "speed":5, "dexterity":5, "defense":5}'::jsonb,
  resources JSONB DEFAULT '{"hp":{"current":100,"max":100}, "energy":{"current":100,"max":100}, "nerve":{"current":100,"max":100}, "happiness":{"current":100,"max":100}}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 4. Create RLS policies
-- Users can SELECT their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Users can INSERT their own profile (used during registration)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Create a trigger to automatically set updated_at on row update
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
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- 6. Create a function that inserts a profile row for new auth.users
-- This function can be called by a trigger on auth.users, but Supabase doesn't
-- expose triggers on auth.users by default. Instead, we'll rely on the frontend
-- to insert the row after registration. However, we provide this function as a
-- convenience for manual execution or for setting up a trigger if you have
-- access to the auth schema.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, gender, level, xp, cash, bank, vault, filotimo, meson, crime_xp, status, stats, resources)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'gender', 'male'),
    1,
    0,
    500,
    0,
    0,
    50,
    0,
    0,
    'free',
    '{"strength":5, "speed":5, "dexterity":5, "defense":5}'::jsonb,
    '{"hp":{"current":100,"max":100}, "energy":{"current":100,"max":100}, "nerve":{"current":100,"max":100}, "happiness":{"current":100,"max":100}}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Optional: Create a trigger on auth.users (requires superuser privileges).
-- If you have superuser access, you can uncomment and run the following:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles (level);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles (updated_at);

-- 9. Grant necessary permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;