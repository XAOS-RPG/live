-- Add save_data column to profiles for full cross-device sync
-- Run this in the Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS save_data JSONB DEFAULT NULL;

-- Index for faster access (optional, save_data is only read on login)
CREATE INDEX IF NOT EXISTS idx_profiles_save_data_ts
ON public.profiles ((save_data->>'timestamp'));
