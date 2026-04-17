-- ============================================================
-- Territory Wars & Heist System Schema
-- Run in Supabase SQL editor
-- After running, enable Realtime for: territory_control, heist_lobbies, heist_members
-- ============================================================

-- Territory control: one row per city, tracks which faction owns it
CREATE TABLE IF NOT EXISTS territory_control (
  city_id                TEXT PRIMARY KEY,
  faction_id             TEXT NOT NULL DEFAULT '',
  captured_at            BIGINT NOT NULL DEFAULT 0,
  siege_ends_at          BIGINT,
  siege_attacker_faction TEXT,
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 7 cities as neutral
INSERT INTO territory_control (city_id, faction_id, captured_at)
VALUES
  ('athens',       '', 0),
  ('thessaloniki', '', 0),
  ('patras',       '', 0),
  ('heraklion',    '', 0),
  ('mykonos',      '', 0),
  ('santorini',    '', 0),
  ('corfu',        '', 0)
ON CONFLICT (city_id) DO NOTHING;

-- RLS: all authenticated users can read; updates go through RPC (service role)
ALTER TABLE territory_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "territory_select_all" ON territory_control
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "territory_update_own" ON territory_control
  FOR UPDATE TO authenticated USING (true);

-- Siege participants: tracks who joined each siege and their combat contribution
CREATE TABLE IF NOT EXISTS siege_participants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siege_city_id    TEXT NOT NULL,
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  faction_id       TEXT NOT NULL,
  side             TEXT NOT NULL CHECK (side IN ('attacker', 'defender')),
  str_contribution INT NOT NULL DEFAULT 0,
  def_contribution INT NOT NULL DEFAULT 0,
  joined_at        BIGINT NOT NULL
);

ALTER TABLE siege_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "siege_participants_select" ON siege_participants
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "siege_participants_insert_own" ON siege_participants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "siege_participants_delete_own" ON siege_participants
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes for siege lookups
CREATE INDEX IF NOT EXISTS siege_city_idx ON siege_participants (siege_city_id);
CREATE INDEX IF NOT EXISTS siege_user_idx ON siege_participants (user_id);

-- ============================================================
-- Heist System
-- ============================================================

CREATE TABLE IF NOT EXISTS heist_lobbies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'waiting'
                  CHECK (status IN ('waiting', 'active', 'completed', 'failed')),
  leader_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    BIGINT NOT NULL,
  starts_at     BIGINT,
  completed_at  BIGINT,
  total_roll    INT,
  payout_dirty  INT,
  payout_kevlar INT
);

ALTER TABLE heist_lobbies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heist_lobbies_select" ON heist_lobbies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "heist_lobbies_insert_own" ON heist_lobbies
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = leader_id);

CREATE POLICY "heist_lobbies_update_leader" ON heist_lobbies
  FOR UPDATE TO authenticated USING (auth.uid() = leader_id);

CREATE TABLE IF NOT EXISTS heist_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id  UUID REFERENCES heist_lobbies(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  username  TEXT,
  role      TEXT NOT NULL CHECK (role IN ('hacker', 'executor', 'businessman')),
  roll      INT,
  joined_at BIGINT NOT NULL,
  UNIQUE (lobby_id, user_id),
  UNIQUE (lobby_id, role)
);

ALTER TABLE heist_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heist_members_select" ON heist_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "heist_members_insert_own" ON heist_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "heist_members_update_own" ON heist_members
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "heist_members_delete_own" ON heist_members
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS heist_lobbies_status_idx ON heist_lobbies (status);
CREATE INDEX IF NOT EXISTS heist_members_lobby_idx ON heist_members (lobby_id);
CREATE INDEX IF NOT EXISTS heist_members_user_idx ON heist_members (user_id);

-- ============================================================
-- After running this file:
-- 1. Go to Supabase Dashboard → Database → Replication
-- 2. Enable Realtime for: territory_control, heist_lobbies, heist_members
-- ============================================================
