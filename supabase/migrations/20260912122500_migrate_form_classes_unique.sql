-- Migration: 20260912122500_migrate_form_classes_unique.sql
-- Description: Convert legacy Form 1-5 classes to CBC Grade 9-12 / Grade 12 Advanced

UPDATE classes
SET 
  class_type = 'Grade',
  grade_level = 9,
  cbc_band = 'junior_secondary',
  display_name = 'Grade 9' || CASE WHEN stream IS NOT NULL AND stream <> '' THEN ' ' || stream ELSE '' END
WHERE form_level = 1;

UPDATE classes
SET 
  class_type = 'Grade',
  grade_level = 10,
  cbc_band = 'senior_secondary',
  display_name = 'Grade 10' || CASE WHEN stream IS NOT NULL AND stream <> '' THEN ' ' || stream ELSE '' END
WHERE form_level = 2;

UPDATE classes
SET 
  class_type = 'Grade',
  grade_level = 11,
  cbc_band = 'senior_secondary',
  display_name = 'Grade 11' || CASE WHEN stream IS NOT NULL AND stream <> '' THEN ' ' || stream ELSE '' END
WHERE form_level = 3;

UPDATE classes
SET 
  class_type = 'Grade',
  grade_level = 12,
  cbc_band = 'senior_secondary',
  display_name = 'Grade 12' || CASE WHEN stream IS NOT NULL AND stream <> '' THEN ' ' || stream ELSE '' END
WHERE form_level = 4;

UPDATE classes
SET 
  class_type = 'Grade',
  grade_level = 12,
  cbc_band = 'senior_secondary',
  display_name = 'Grade 12 Advanced' || CASE WHEN stream IS NOT NULL AND stream <> '' THEN ' ' || stream ELSE '' END
WHERE form_level = 5;

UPDATE students
SET grade_level = CASE
  WHEN form_level = 1 THEN 9
  WHEN form_level = 2 THEN 10
  WHEN form_level = 3 THEN 11
  WHEN form_level = 4 THEN 12
  WHEN form_level = 5 THEN 12
  ELSE grade_level
END
WHERE grade_level IS NULL AND form_level IS NOT NULL;
