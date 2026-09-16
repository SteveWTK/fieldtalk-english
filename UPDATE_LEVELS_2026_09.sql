-- UPDATE_LEVELS_2026_09.sql
--
-- Rewrites the seeded placeholder levels with David's career-journey
-- naming (2026-09) and extends the ladder from 8 to 10 levels.
-- New progression:
--
--   MACROFASE 1 — Preparação e base (Levels 1-3, A1 → A2)
--   MACROFASE 2 — Chegada e embarque (Levels 4-6, A2+ → B1+)
--   MACROFASE 3 — Consolidação e liderança (Levels 7-10, B2 → C1+/C2)
--
-- Approach: UPDATE existing sort_order 1-8 by their old slug names
-- (foundations / building_blocks / etc.), then INSERT levels 9 + 10.
-- Slugs (`name`) are renamed so the URL / internal ref matches the
-- new theme — safe because no player has earned a certificate yet
-- and the slug isn't referenced anywhere in code except by id.
--
-- Signal tones distributed across the 3 macrofases so a player's
-- eye reads phase-of-journey at a glance:
--   Macrofase 1 → signal-english (sky, "communication foundations")
--   Macrofase 2 → signal-mental (violet, "adjust to a new culture")
--   Macrofase 3 → signal-performance (orange, "active, public work")
--   Level 10   → accent-400 (lime, "you've arrived")
--
-- Icons are Lucide component names (see LevelBanner.js icon
-- resolver). Any valid Lucide export works, so tweak freely from the
-- admin UI at /admin/levels once this runs.

-- ─────────────────────────────────────────────────────────────
-- MACROFASE 1: PREPARAÇÃO E BASE
-- ─────────────────────────────────────────────────────────────

UPDATE levels
  SET name            = 'elite_prospect',
      display_name_pt = 'Base de Elite',
      display_name_en = 'The Elite Prospect',
      description_pt  = 'Comandos básicos de jogo ("Man on!", "Time!"), controle de frustração pós-treino e disciplina com o robô.',
      description_en  = 'On-pitch basics ("Man on!", "Time!"), post-training composure, and the discipline of the daily grind.',
      cefr_target     = 'A1',
      signal_tone     = 'english',
      icon_name       = 'Sprout',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'foundations';

UPDATE levels
  SET name            = 'transition_ready',
      display_name_pt = 'Pronto para a Transição',
      display_name_en = 'Transition Ready',
      description_pt  = 'Diálogo básico com a arbitragem, entendimento do painel tático da comissão e resiliência no banco.',
      description_en  = 'Basic exchanges with referees, reading the coaching staff''s tactical board, and bench resilience.',
      cefr_target     = 'A1+',
      signal_tone     = 'english',
      icon_name       = 'Milestone',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'building_blocks';

UPDATE levels
  SET name            = 'global_standard',
      display_name_pt = 'Padrão Global',
      display_name_en = 'Global Standard',
      description_pt  = 'Comunicação integrada em campo (ajustes de linha, pressão), gestão de redes sociais e inteligência extra-campo.',
      description_en  = 'Joined-up on-pitch communication (line adjustments, pressing triggers), social-media care, and off-pitch awareness.',
      cefr_target     = 'A2',
      signal_tone     = 'english',
      icon_name       = 'Globe',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'everyday_football';

-- ─────────────────────────────────────────────────────────────
-- MACROFASE 2: CHEGADA E EMBARQUE
-- ─────────────────────────────────────────────────────────────

UPDATE levels
  SET name            = 'boarding_gate',
      display_name_pt = 'Passaporte Carimbado',
      display_name_en = 'The Boarding Gate',
      description_pt  = 'Inglês para exames médicos, trâmites de aeroporto, assinatura de contratos e primeiras conversas formais com a diretoria.',
      description_en  = 'English for medicals, airport logistics, signing contracts, and first formal conversations with the front office.',
      cefr_target     = 'A2+',
      signal_tone     = 'mental',
      icon_name       = 'PlaneTakeoff',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'squad_life';

UPDATE levels
  SET name            = 'locker_room_integration',
      display_name_pt = 'Integração de Vestiário',
      display_name_en = 'Locker Room Integration',
      description_pt  = 'Gírias do futebol internacional. Psicologia focada em vencer o choque cultural, a solidão e a distância nos primeiros meses.',
      description_en  = 'International football slang. The psychology of getting through culture shock, loneliness, and being far from home.',
      cefr_target     = 'B1',
      signal_tone     = 'mental',
      icon_name       = 'Users',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'match_situations';

UPDATE levels
  SET name            = 'first_big_contract',
      display_name_pt = 'O Primeiro Contrato',
      display_name_en = 'The First Big Contract',
      description_pt  = 'Expressões básicas de finanças para atletas (conta, impostos). Psicologia para evitar o deslumbramento com os primeiros grandes salários.',
      description_en  = 'Athlete finance basics (accounts, tax). Keeping your head when the first big paycheque lands.',
      cefr_target     = 'B1+',
      signal_tone     = 'mental',
      icon_name       = 'FileSignature',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'media_and_press';

-- ─────────────────────────────────────────────────────────────
-- MACROFASE 3: CONSOLIDAÇÃO E LIDERANÇA
-- ─────────────────────────────────────────────────────────────

UPDATE levels
  SET name            = 'media_press_ready',
      display_name_pt = 'Zona Mista e Mídia',
      display_name_en = 'Media & Press Ready',
      description_pt  = 'Media training em inglês. Como responder a perguntas difíceis após derrotas e conduzir flash interviews à beira do campo.',
      description_en  = 'Media training in English. Handling tough post-match questions and running pitchside flash interviews.',
      cefr_target     = 'B2',
      signal_tone     = 'performance',
      icon_name       = 'Mic',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'advanced_fluency';

UPDATE levels
  SET name            = 'advanced_game_reading',
      display_name_pt = 'Leitura de Jogo Avançada',
      display_name_en = 'Advanced Game Reading',
      description_pt  = 'Vocabulário tático complexo (análise de vídeo, termos de transição ofensiva/defensiva). Psicologia de liderança tática.',
      description_en  = 'Advanced tactical vocabulary (video analysis, transition terminology). The psychology of tactical leadership.',
      cefr_target     = 'B2+',
      signal_tone     = 'performance',
      icon_name       = 'Radar',
      is_active       = true,
      updated_at      = NOW()
  WHERE name = 'mastery_paths';

-- ─────────────────────────────────────────────────────────────
-- New levels 9 + 10 — the leadership + world-class rungs
-- ─────────────────────────────────────────────────────────────

INSERT INTO levels (sort_order, name, display_name_pt, display_name_en,
                    description_pt, description_en, cefr_target,
                    signal_tone, icon_name, is_active, is_specialised)
VALUES
  (9,  'captains_mindset',      'Liderança e Capitania',    'The Captain''s Mindset',
       'Como cobrar companheiros de equipe, mediar conflitos internos de vestiário e falar formalmente com a Federação/Liga.',
       'Holding teammates to account, mediating dressing-room disputes, and speaking formally with the federation / league.',
       'C1',  'performance', 'Crown',      true, false),
  (10, 'world_class_performer', 'Atleta de Elite Global',   'World Class Performer',
       'Proficiência avançada para palestras, eventos de patrocinadores, premiações e posicionamento de marca pessoal no mercado global.',
       'Advanced English for talks, sponsor events, awards nights, and building a personal brand on the global stage.',
       'C1+', 'accent',      'Trophy',     true, false)
ON CONFLICT (name) DO NOTHING;

-- Sanity check — the new ladder after the run.
--   SELECT sort_order, name, display_name_en, cefr_target, signal_tone, icon_name
--     FROM levels ORDER BY sort_order;
