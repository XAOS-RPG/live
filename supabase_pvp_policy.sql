-- PVP: allow authenticated users to read other players' public info
-- Run in Supabase SQL Editor

-- Drop old own-only policy if still exists
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Allow any authenticated user to read all profiles (RLS controls rows, app controls columns)
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow attackers to deduct cash from defender (needed for PVP cash steal)
-- We use a Postgres function with SECURITY DEFINER to safely apply the deduction
CREATE OR REPLACE FUNCTION public.pvp_apply_result(
  p_attacker_id   UUID,
  p_defender_id   UUID,
  p_cash_stolen   INTEGER,
  p_attacker_won  BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if attacker won and there's cash to steal
  IF p_attacker_won AND p_cash_stolen > 0 THEN
    -- Deduct from defender (floor at 0)
    UPDATE public.profiles
    SET cash = GREATEST(0, cash - p_cash_stolen)
    WHERE id = p_defender_id;
  END IF;

  -- Insert attack log
  INSERT INTO public.attack_logs (attacker_id, defender_id, result, cash_stolen)
  VALUES (
    p_attacker_id,
    p_defender_id,
    CASE WHEN p_attacker_won THEN 'attacker_won' ELSE 'defender_won' END,
    CASE WHEN p_attacker_won THEN p_cash_stolen ELSE 0 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.pvp_apply_result TO authenticated;
