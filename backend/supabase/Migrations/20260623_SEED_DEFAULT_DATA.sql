-- ==========================================
-- SEED DATA: Default Assessment Types & Grading Scales
-- Run AFTER the comprehensive grading system migration
-- Requires: institution_id parameter
-- ==========================================

-- Usage:
--   Replace '5c543f07-75d7-4ed5-941f-295ef0274700' with the actual UUID
--   Then run this file in Supabase SQL Editor

-- ==========================================
-- 1. DEFAULT ASSESSMENT TYPES
-- ==========================================
-- These are common assessment types used in schools.
-- Institutions can customize weights via subject_weights table.

INSERT INTO assessment_types (name, code, category, default_weight, display_order, is_active, institution_id)
VALUES
  -- Continuous Assessment Types
  ('Assignment', 'ASG', 'continuous_assessment', 10.00, 1, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Quiz', 'QUIZ', 'continuous_assessment', 10.00, 2, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Class Test', 'CT', 'continuous_assessment', 15.00, 3, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Project', 'PRJ', 'continuous_assessment', 10.00, 4, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Presentation', 'PRES', 'continuous_assessment', 5.00, 5, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Homework', 'HW', 'continuous_assessment', 5.00, 6, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Participation', 'PART', 'continuous_assessment', 5.00, 7, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Lab Work', 'LAB', 'continuous_assessment', 10.00, 8, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  -- Examination Types
  ('Mid-Term Exam', 'MID', 'examination', 20.00, 10, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Final Exam', 'FIN', 'examination', 30.00, 11, true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Term Exam', 'TRM', 'examination', 30.00, 12, true, '5c543f07-75d7-4ed5-941f-295ef0274700')
ON CONFLICT (code, institution_id) DO NOTHING;

-- ==========================================
-- 2. STANDARD 7-POINT GRADING SCALE
-- ==========================================
-- This is a widely used US-style grading scale.
-- Institutions can add their own custom scales via the admin UI.

INSERT INTO grading_scales (name, min_score, max_score, letter_grade, gpa_points, description, is_active, institution_id)
VALUES
  ('Standard 7-Point', 93.00, 100.00, 'A',  4.0, 'Excellent',          true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 90.00, 92.99,  'A-', 3.7, 'Very Good',          true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 87.00, 89.99,  'B+', 3.3, 'Good Plus',          true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 83.00, 86.99,  'B',  3.0, 'Good',               true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 80.00, 82.99,  'B-', 2.7, 'Above Average',      true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 77.00, 79.99,  'C+', 2.3, 'Average Plus',       true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 73.00, 76.99,  'C',  2.0, 'Average',            true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 70.00, 72.99,  'C-', 1.7, 'Below Average',      true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 67.00, 69.99,  'D+', 1.3, 'Poor Plus',          true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 63.00, 66.99,  'D',  1.0, 'Poor',               true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 60.00, 62.99,  'D-', 0.7, 'Minimal Passing',    true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ('Standard 7-Point', 0.00,  59.99,  'F',  0.0, 'Failing',            true, '5c543f07-75d7-4ed5-941f-295ef0274700')
ON CONFLICT DO NOTHING;

-- ==========================================
-- 3. OPTIONAL: 5-POINT SCALE (for simpler systems)
-- ==========================================

-- INSERT INTO grading_scales (name, min_score, max_score, letter_grade, gpa_points, description, is_active, institution_id)
-- VALUES
--  ('5-Point Scale', 90.00, 100.00, 'A', 5.0, 'Excellent',   true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
--  ('5-Point Scale', 80.00, 89.99,  'B', 4.0, 'Good',        true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
--  ('5-Point Scale', 70.00, 79.99,  'C', 3.0, 'Average',     true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
--  ('5-Point Scale', 60.00, 69.99,  'D', 2.0, 'Below Average', true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
--  ('5-Point Scale', 0.00,  59.99,  'F', 1.0, 'Failing',     true, '5c543f07-75d7-4ed5-941f-295ef0274700')
-- ON CONFLICT DO NOTHING;

-- ==========================================
-- 4. CURRENT ACADEMIC YEAR & TERMS (Optional seed)
-- ==========================================
-- Uncomment and adjust dates for your institution's academic calendar

INSERT INTO academic_years (name, start_date, end_date, is_current, institution_id)
VALUES ('2025-2026', '2025-09-01', '2026-06-30', true, '5c543f07-75d7-4ed5-941f-295ef0274700');

-- With the academic year ID, create terms:
INSERT INTO terms (academic_year_id, name, start_date, end_date, is_current, institution_id)
VALUES
  ((SELECT id FROM academic_years WHERE name = '2025-2026' AND institution_id = '5c543f07-75d7-4ed5-941f-295ef0274700'),
   'Fall Term', '2025-09-01', '2025-12-20', true, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ((SELECT id FROM academic_years WHERE name = '2025-2026' AND institution_id = '5c543f07-75d7-4ed5-941f-295ef0274700'),
   'Spring Term', '2026-01-05', '2026-04-10', false, '5c543f07-75d7-4ed5-941f-295ef0274700'),
  ((SELECT id FROM academic_years WHERE name = '2025-2026' AND institution_id = '5c543f07-75d7-4ed5-941f-295ef0274700'),
   'Summer Term', '2026-04-20', '2026-06-30', false, '5c543f07-75d7-4ed5-941f-295ef0274700');
