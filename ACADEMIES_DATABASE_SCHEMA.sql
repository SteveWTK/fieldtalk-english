-- FieldTalk Academies/Clubs - Database Schema
-- Run this in your Supabase SQL Editor after running DATABASE_UPDATES.sql

-- =====================================================
-- PHASE 1: CREATE ACADEMIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS academies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_type TEXT DEFAULT 'per_player', -- 'per_player', 'unlimited', 'trial'
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_academies_is_active ON academies(is_active);
CREATE INDEX IF NOT EXISTS idx_academies_name ON academies(name);

-- =====================================================
-- PHASE 2: ADD ACADEMY_ID TO PLAYERS TABLE
-- =====================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS academy_id UUID REFERENCES academies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_players_academy_id ON players(academy_id);

-- =====================================================
-- PHASE 3: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on academies table
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all academies
CREATE POLICY "Platform admins can view all academies"
  ON academies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
  );

-- Academy admins can view their own academy
CREATE POLICY "Academy admins can view their academy"
  ON academies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT academy_id FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'client_admin'
    )
  );

-- Platform admins can manage all academies
CREATE POLICY "Platform admins can manage academies"
  ON academies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
  );

-- =====================================================
-- PHASE 4: UPDATE PLAYERS TABLE POLICIES
-- =====================================================

-- Players can view other players in their academy (for admin)
CREATE POLICY "Academy admins can view their players"
  ON players FOR SELECT
  TO authenticated
  USING (
    academy_id IN (
      SELECT academy_id FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'client_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = auth.uid()
      AND p.user_type = 'platform_admin'
    )
  );

-- =====================================================
-- PHASE 5: HELPER VIEWS (OPTIONAL BUT USEFUL)
-- =====================================================

-- View for academy summaries
CREATE OR REPLACE VIEW academy_summaries AS
SELECT
  a.id,
  a.name,
  a.country,
  a.city,
  a.contact_email,
  a.is_active,
  a.subscription_type,
  COUNT(DISTINCT p.id) FILTER (WHERE p.user_type = 'player') as player_count,
  COUNT(DISTINCT p.id) FILTER (WHERE p.user_type = 'client_admin') as admin_count,
  a.created_at
FROM academies a
LEFT JOIN players p ON p.academy_id = a.id
GROUP BY a.id, a.name, a.country, a.city, a.contact_email, a.is_active, a.subscription_type, a.created_at;

-- =====================================================
-- DONE!
-- =====================================================

-- Summary of changes:
-- 1. Created 'academies' table to store academy/club information
-- 2. Added 'academy_id' column to 'players' table
-- 3. Set up RLS policies for academy access control
-- 4. Created helper views for easier querying
--
-- Next steps:
-- 1. Create academy admin users with user_type = 'client_admin'
-- 2. Assign them to academies (set academy_id in players table)
-- 3. They can create players (triggers billing)
-- 4. Set players' client_type = 'player' to show player-focused lessons