-- FieldTalk - Guest Access System Database Schema
-- Run these commands in your Supabase SQL Editor
--
-- This schema supports the QR Campaign Guest Access System that allows
-- users to access the app without creating an account for a configurable duration.

-- =====================================================
-- STEP 1: CREATE USERS TABLE (for guest accounts)
-- =====================================================
-- Note: This is separate from the 'players' table which is for regular users.
-- Guest users are created in 'users' table and can later be converted to
-- regular accounts in the 'players' table.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT DEFAULT 'Guest Player',
  role TEXT DEFAULT 'User' CHECK (role IN ('User', 'guest', 'admin')),
  is_premium BOOLEAN DEFAULT false,
  premium_until TIMESTAMPTZ,
  premium_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- =====================================================
-- STEP 2: CREATE GUEST ACCESS CODES TABLE (campaigns)
-- =====================================================

CREATE TABLE IF NOT EXISTS guest_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                    -- e.g., 'QR-A1B2C3D4'
  name TEXT NOT NULL,                           -- Admin-friendly name
  destination_path TEXT DEFAULT '/dashboard',   -- Where to redirect after activation
  access_tier TEXT DEFAULT 'premium'            -- 'basic', 'premium', 'full'
    CHECK (access_tier IN ('basic', 'premium', 'full')),
  duration_hours INTEGER DEFAULT 72,            -- How long guest access lasts
  max_uses INTEGER,                             -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  campaign_name TEXT,                           -- For analytics grouping
  campaign_location TEXT,                       -- Physical location if relevant
  welcome_message TEXT,                         -- Shown on activation (EN)
  welcome_message_pt TEXT,                      -- Portuguese
  welcome_message_th TEXT,                      -- Thai
  created_by UUID REFERENCES auth.users(id),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                       -- When the CODE expires (not session)
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for guest_access_codes
CREATE INDEX IF NOT EXISTS idx_guest_access_codes_code ON guest_access_codes(code);
CREATE INDEX IF NOT EXISTS idx_guest_access_codes_is_active ON guest_access_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_guest_access_codes_campaign ON guest_access_codes(campaign_name);

-- Enable RLS
ALTER TABLE guest_access_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest_access_codes
CREATE POLICY "Admins can manage guest access codes"
  ON guest_access_codes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type IN ('platform_admin', 'client_admin')
    )
  );

CREATE POLICY "Public can read active codes for validation"
  ON guest_access_codes FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- =====================================================
-- STEP 3: CREATE GUEST SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_code_id UUID REFERENCES guest_access_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_tier TEXT NOT NULL,
  destination_path TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,              -- When THIS session expires
  converted_at TIMESTAMPTZ,                     -- When guest became real user
  converted_to_email TEXT,                      -- The email they signed up with
  device_info JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for guest_sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_user_id ON guest_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_access_code_id ON guest_sessions(access_code_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_converted_at ON guest_sessions(converted_at);

-- Enable RLS
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest_sessions
CREATE POLICY "Users can view own sessions"
  ON guest_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON guest_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type IN ('platform_admin', 'client_admin')
    )
  );

-- =====================================================
-- STEP 4: CREATE ACTIVATE_GUEST_CODE FUNCTION
-- =====================================================
-- This function atomically validates and activates a QR code

CREATE OR REPLACE FUNCTION activate_guest_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code RECORD;
BEGIN
  -- Find and lock the code
  SELECT * INTO v_code
  FROM guest_access_codes
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not found');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code is inactive');
  END IF;

  IF v_code.starts_at > NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code not yet active');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code has expired');
  END IF;

  IF v_code.max_uses IS NOT NULL AND v_code.current_uses >= v_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code usage limit reached');
  END IF;

  -- Increment usage count
  UPDATE guest_access_codes
  SET current_uses = current_uses + 1
  WHERE id = v_code.id;

  RETURN jsonb_build_object(
    'success', true,
    'code_id', v_code.id,
    'destination_path', v_code.destination_path,
    'access_tier', v_code.access_tier,
    'duration_hours', v_code.duration_hours,
    'welcome_message', v_code.welcome_message,
    'welcome_message_pt', v_code.welcome_message_pt,
    'welcome_message_th', v_code.welcome_message_th,
    'campaign_name', v_code.campaign_name,
    'campaign_location', v_code.campaign_location
  );
END;
$$;

-- =====================================================
-- STEP 5: CREATE HELPER VIEWS (optional but useful)
-- =====================================================

-- View for campaign analytics
CREATE OR REPLACE VIEW guest_campaign_stats AS
SELECT
  gac.id,
  gac.code,
  gac.name,
  gac.campaign_name,
  gac.campaign_location,
  gac.is_active,
  gac.current_uses,
  gac.max_uses,
  gac.created_at,
  gac.expires_at,
  COUNT(gs.id) AS total_sessions,
  COUNT(gs.id) FILTER (WHERE gs.converted_at IS NOT NULL) AS converted_sessions,
  COUNT(gs.id) FILTER (WHERE gs.expires_at > NOW() AND gs.converted_at IS NULL) AS active_sessions,
  COUNT(gs.id) FILTER (WHERE gs.expires_at <= NOW() AND gs.converted_at IS NULL) AS expired_sessions,
  CASE
    WHEN COUNT(gs.id) > 0
    THEN ROUND((COUNT(gs.id) FILTER (WHERE gs.converted_at IS NOT NULL)::numeric / COUNT(gs.id)::numeric) * 100, 1)
    ELSE 0
  END AS conversion_rate
FROM guest_access_codes gac
LEFT JOIN guest_sessions gs ON gs.access_code_id = gac.id
GROUP BY gac.id;

-- =====================================================
-- STEP 6: GRANT PERMISSIONS
-- =====================================================

-- Grant execute on the RPC function
GRANT EXECUTE ON FUNCTION activate_guest_code(TEXT) TO anon, authenticated;

-- =====================================================
-- NOTES FOR DEPLOYMENT
-- =====================================================
--
-- 1. Make sure you have SUPABASE_SERVICE_ROLE_KEY set in your environment
--    for the admin operations (creating users, etc.)
--
-- 2. Add CRON_SECRET to your environment variables for the cleanup cron job
--
-- 3. The cleanup cron runs daily at 3 AM UTC (configured in vercel.json)
--    and deletes expired guest accounts older than 30 days
--
-- 4. Guest email format: guest_[random]@fieldtalk.guest
--    These emails are not real and are just placeholders
--
-- 5. When a guest converts to a real account:
--    - Their auth email/password is updated
--    - Their users record is updated with real email and role='User'
--    - Their guest_session is marked as converted
--    - All their progress (XP, lessons, etc.) is preserved
