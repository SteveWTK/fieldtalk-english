-- VOCABULARY_SEED.sql
--
-- Initial vocabulary seed. Run AFTER VOCABULARY_TABLE.sql. Idempotent
-- via the (lower(en_term), category, coalesce(edition,'')) unique
-- index — re-running won't duplicate rows, and you can re-import
-- with ON CONFLICT DO NOTHING (default).
--
-- Two seed batches:
--   1. Positions  (12 entries, no images) — mirrors the legacy
--      hard-coded MemoryMatch deck so behaviour stays identical after
--      the refactor.
--   2. Flags      (WC2026 nations, image-based) — pulls from the
--      Supabase storage bucket. Filenames are alpha-2 codes
--      (ar.png, br.png, …) with two ISO 3166-2 codes for the UK
--      home nations (gb-eng.png, gb-sct.png).
--
-- Image URLs use the public Supabase storage URL pattern:
--   https://<project>.supabase.co/storage/v1/object/public/Images/vocab/flags/<code>.png
--
-- If a country in the seed didn't actually qualify, just DELETE the
-- row — no migration ripple, since rows are loosely coupled to the
-- game (the game shuffles whatever exists for a category).

-- ── POSITIONS (no images — EN ↔ PT card pairs) ────────────────────
INSERT INTO vocabulary
  (en_term, pt_term, category, edition, is_active, sort_order)
VALUES
  ('Goalkeeper',             'Goleiro',              'positions', NULL, TRUE, 10),
  ('Centre back',            'Zagueiro central',     'positions', NULL, TRUE, 20),
  ('Right back',             'Lateral direito',      'positions', NULL, TRUE, 30),
  ('Left back',              'Lateral esquerdo',     'positions', NULL, TRUE, 40),
  ('Defensive midfielder',   'Volante',              'positions', NULL, TRUE, 50),
  ('Midfielder',             'Meio-campista',        'positions', NULL, TRUE, 60),
  ('Attacking midfielder',   'Meia atacante',        'positions', NULL, TRUE, 70),
  ('Playmaker',              'Armador',              'positions', NULL, TRUE, 80),
  ('Right winger',           'Ponta direita',        'positions', NULL, TRUE, 90),
  ('Left winger',            'Ponta esquerda',       'positions', NULL, TRUE, 100),
  ('Centre forward',         'Centro-avante',        'positions', NULL, TRUE, 110),
  ('Striker',                'Atacante',             'positions', NULL, TRUE, 120)
ON CONFLICT DO NOTHING;

-- ── FLAGS (WC2026 nations — IMAGE ↔ EN card pairs) ────────────────
-- pt_term is intentionally identical (or near-identical) to en_term
-- for nation names — the column is NOT NULL so we mirror EN. The
-- Memory Match shows IMAGE + EN by default whenever image_url is set,
-- so PT here is just a courtesy fallback if an image ever 404s.
--
-- 48 teams below covering hosts + qualifiers across confederations.
-- Trim or swap rows freely if the final WC2026 bracket differs.
INSERT INTO vocabulary
  (en_term, pt_term, category, edition, image_url, is_active, sort_order)
VALUES
  -- Hosts
  ('USA',                    'Estados Unidos',       'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/us.png', TRUE, 10),
  ('Canada',                 'Canadá',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ca.png', TRUE, 20),
  ('Mexico',                 'México',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/mx.png', TRUE, 30),

  -- South America (CONMEBOL)
  ('Argentina',              'Argentina',            'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ar.png', TRUE, 100),
  ('Brazil',                 'Brasil',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/br.png', TRUE, 110),
  ('Uruguay',                'Uruguai',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/uy.png', TRUE, 120),
  ('Colombia',               'Colômbia',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/co.png', TRUE, 130),
  ('Ecuador',                'Equador',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ec.png', TRUE, 140),
  ('Paraguay',               'Paraguai',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/py.png', TRUE, 150),

  -- CONCACAF (beyond hosts)
  ('Costa Rica',             'Costa Rica',           'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/cr.png', TRUE, 200),
  ('Panama',                 'Panamá',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/pa.png', TRUE, 210),
  ('Jamaica',                'Jamaica',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/jm.png', TRUE, 220),
  ('Haiti',                  'Haiti',                'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ht.png', TRUE, 230),
  ('Curaçao',                'Curaçao',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/cw.png', TRUE, 240),

  -- UEFA (Europe — 16 slots)
  ('Spain',                  'Espanha',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/es.png', TRUE, 300),
  ('Portugal',               'Portugal',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/pt.png', TRUE, 310),
  ('France',                 'França',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/fr.png', TRUE, 320),
  ('Germany',                'Alemanha',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/de.png', TRUE, 330),
  ('England',                'Inglaterra',           'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/gb-eng.png', TRUE, 340),
  ('Scotland',               'Escócia',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/gb-sct.png', TRUE, 350),
  ('Netherlands',            'Holanda',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/nl.png', TRUE, 360),
  ('Belgium',                'Bélgica',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/be.png', TRUE, 370),
  ('Croatia',                'Croácia',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/hr.png', TRUE, 380),
  ('Switzerland',            'Suíça',                'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ch.png', TRUE, 390),
  ('Austria',                'Áustria',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/at.png', TRUE, 400),
  ('Norway',                 'Noruega',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/no.png', TRUE, 410),
  ('Sweden',                 'Suécia',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/se.png', TRUE, 420),
  ('Denmark',                'Dinamarca',            'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/dk.png', TRUE, 430),
  ('Serbia',                 'Sérvia',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/rs.png', TRUE, 440),
  ('Türkiye',                'Turquia',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/tr.png', TRUE, 450),
  ('Ukraine',                'Ucrânia',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ua.png', TRUE, 460),
  ('Bosnia and Herzegovina', 'Bósnia e Herzegovina', 'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ba.png', TRUE, 470),

  -- AFC (Asia)
  ('Japan',                  'Japão',                'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/jp.png', TRUE, 500),
  ('South Korea',            'Coreia do Sul',        'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/kr.png', TRUE, 510),
  ('Iran',                   'Irã',                  'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ir.png', TRUE, 520),
  ('Saudi Arabia',           'Arábia Saudita',       'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/sa.png', TRUE, 530),
  ('Australia',              'Austrália',            'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/au.png', TRUE, 540),
  ('Uzbekistan',             'Uzbequistão',          'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/uz.png', TRUE, 550),
  ('Iraq',                   'Iraque',               'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/iq.png', TRUE, 560),
  ('Jordan',                 'Jordânia',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/jo.png', TRUE, 570),
  ('Qatar',                  'Catar',                'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/qa.png', TRUE, 580),

  -- CAF (Africa)
  ('Morocco',                'Marrocos',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ma.png', TRUE, 600),
  ('Senegal',                'Senegal',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/sn.png', TRUE, 610),
  ('Tunisia',                'Tunísia',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/tn.png', TRUE, 620),
  ('Algeria',                'Argélia',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/dz.png', TRUE, 630),
  ('Egypt',                  'Egito',                'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/eg.png', TRUE, 640),
  ('Nigeria',                'Nigéria',              'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ng.png', TRUE, 650),
  ('Côte d''Ivoire',         'Costa do Marfim',      'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/ci.png', TRUE, 660),
  ('Cape Verde',             'Cabo Verde',           'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/cv.png', TRUE, 670),
  ('Ghana',                  'Gana',                 'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/gh.png', TRUE, 680),
  ('South Africa',           'África do Sul',        'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/za.png', TRUE, 690),
  ('DR Congo',               'RD Congo',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/cd.png', TRUE, 700),
  ('Cameroon',               'Camarões',             'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/cm.png', TRUE, 710),

  -- OFC (Oceania)
  ('New Zealand',            'Nova Zelândia',        'flags', 'wc2026',
    'https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/Images/vocab/flags/nz.png', TRUE, 800)
ON CONFLICT DO NOTHING;
