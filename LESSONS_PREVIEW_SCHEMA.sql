-- FieldTalk — preview-lesson flag on lessons
-- ------------------------------------------
-- Adds a per-lesson is_preview boolean so admins can pick exactly
-- which lessons unpaid users can sample (the API used to compute
-- "first lesson per pillar" automatically; this gives explicit
-- control via the Supabase table editor).
--
-- After running this, set is_preview = true on whichever lessons
-- you want as free taster — see PART 2 for the WC2026 default
-- (first 2 lessons of Unit 1).

-- =====================================================
-- PART 1: schema
-- =====================================================

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS is_preview BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lessons_is_preview
  ON lessons(is_preview)
  WHERE is_preview = true;


-- =====================================================
-- PART 2: WC2026 default — first 2 lessons of Unit 1
-- =====================================================
-- The signature query: find the pillar with the lowest sort_order
-- for edition 'wc2026' (= Unit 1), grab its two lessons with the
-- lowest sort_order, mark them preview.

UPDATE lessons
SET is_preview = true
WHERE id IN (
  SELECT l.id
  FROM lessons l
  JOIN pillars p ON l.pillar_id = p.id
  WHERE p.edition = 'wc2026'
    AND p.sort_order = (
      SELECT MIN(sort_order) FROM pillars WHERE edition = 'wc2026'
    )
  ORDER BY l.sort_order ASC
  LIMIT 2
);


-- =====================================================
-- PART 3: verify
-- =====================================================
-- Should return exactly two rows (titles of Unit 1's lesson 1 + 2).

SELECT l.id, l.title, l.sort_order, p.name AS pillar_name
FROM lessons l
JOIN pillars p ON l.pillar_id = p.id
WHERE l.is_preview = true AND p.edition = 'wc2026'
ORDER BY p.sort_order, l.sort_order;
