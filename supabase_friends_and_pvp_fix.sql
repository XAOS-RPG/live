-- ============================================================
-- FIX 1: Friends table + friends_with_profiles view
-- ============================================================

CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own friend rows" ON public.friends;
CREATE POLICY "Users can manage own friend rows"
ON public.friends
USING (auth.uid() = user_id OR auth.uid() = friend_id)
WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- View that joins friend rows with both profiles
-- level lives inside save_data JSONB, not as a top-level column
DROP VIEW IF EXISTS public.friends_with_profiles;
CREATE VIEW public.friends_with_profiles AS
SELECT
  f.id,
  f.user_id,
  f.friend_id,
  f.status,
  f.created_at,
  -- requester = user_id side
  u.username                                    AS requester_username,
  (u.save_data->>'level')::int                  AS requester_level,
  -- recipient = friend_id side
  fr.username                                   AS recipient_username,
  (fr.save_data->>'level')::int                 AS recipient_level
FROM public.friends f
JOIN public.profiles u  ON u.id  = f.user_id
JOIN public.profiles fr ON fr.id = f.friend_id
WHERE auth.uid() = f.user_id OR auth.uid() = f.friend_id;

GRANT SELECT ON public.friends_with_profiles TO authenticated;

-- ============================================================
-- FIX 2: PVP — allow all authenticated users to read profiles
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Search profiles by username (for Add Friend)
DROP POLICY IF EXISTS "Users can search profiles" ON public.profiles;
-- (covered by the policy above — no separate policy needed)

NOTIFY pgrst, 'reload schema';

SELECT 'Friends table, view, and PVP policy created successfully.' AS message;
