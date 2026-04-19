-- ============================================================
-- Κυριαρχία στις Γειτονιές (Neighborhood Control System)
-- Run in Supabase SQL editor after supabase_territory_heist_schema.sql
-- After running, enable Realtime for: neighborhood_control
-- ============================================================

-- One row per neighborhood. owner_id NULL = unclaimed (neutral).
CREATE TABLE IF NOT EXISTS neighborhood_control (
  neighborhood_id          TEXT PRIMARY KEY,
  owner_id                 UUID REFERENCES profiles(id) ON DELETE SET NULL,
  owner_username           TEXT NOT NULL DEFAULT '',
  owner_level              INT NOT NULL DEFAULT 1,
  wall_hp                  INT NOT NULL DEFAULT 1000,
  captured_at              BIGINT NOT NULL DEFAULT 0,
  last_attacked_at         BIGINT NOT NULL DEFAULT 0,
  last_attacker_username   TEXT NOT NULL DEFAULT '',
  last_maintenance_paid_at BIGINT NOT NULL DEFAULT 0,
  graffiti                 TEXT NOT NULL DEFAULT '',
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Seed 15 neighborhoods as unclaimed
INSERT INTO neighborhood_control (neighborhood_id, wall_hp)
VALUES
  ('korydallos',  1000),
  ('piraeus',     1000),
  ('keratsini',   1000),
  ('glyfada',     1200),
  ('kifisia',     1200),
  ('omonoia',     1000),
  ('nikaia',      1000),
  ('aigaleo',     1000),
  ('exarcheia',   1000),
  ('monastiraki', 1000),
  ('kolonos',     1000),
  ('metaxourgio', 1000),
  ('kypseli',     1000),
  ('vyronas',     1000),
  ('pagkrati',    1000)
ON CONFLICT (neighborhood_id) DO NOTHING;

ALTER TABLE neighborhood_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "neighborhood_select_all" ON neighborhood_control
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "neighborhood_update_auth" ON neighborhood_control
  FOR UPDATE TO authenticated USING (true);

-- Attack log: tracks every wall hit for coalition detection and history display
CREATE TABLE IF NOT EXISTS neighborhood_attack_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  neighborhood_id  TEXT NOT NULL REFERENCES neighborhood_control(neighborhood_id) ON DELETE CASCADE,
  attacker_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attacker_username TEXT NOT NULL DEFAULT '',
  defender_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  damage_dealt     INT NOT NULL DEFAULT 0,
  wall_hp_after    INT NOT NULL DEFAULT 0,
  captured         BOOLEAN NOT NULL DEFAULT FALSE,
  attacked_at      BIGINT NOT NULL
);

ALTER TABLE neighborhood_attack_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attack_log_select_all" ON neighborhood_attack_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "attack_log_insert_own" ON neighborhood_attack_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = attacker_id);

CREATE INDEX IF NOT EXISTS attack_log_neighborhood_idx  ON neighborhood_attack_log (neighborhood_id);
CREATE INDEX IF NOT EXISTS attack_log_attacker_idx      ON neighborhood_attack_log (attacker_id);
CREATE INDEX IF NOT EXISTS attack_log_defender_idx      ON neighborhood_attack_log (defender_id);
CREATE INDEX IF NOT EXISTS attack_log_attacked_at_idx   ON neighborhood_attack_log (attacked_at);

-- ============================================================
-- After running:
-- 1. Supabase Dashboard → Database → Replication
-- 2. Enable Realtime for: neighborhood_control
-- ============================================================
