function isPresent(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Format human-readable class label conforming strictly to CBC baseline.
 * Plain language: Playgroup, PP1, PP2, Grade 1-12.
 * Never outputs legacy 8-4-4 'Form' terminology.
 */
function buildClassLabel(classLike = {}) {
  const value = classLike && typeof classLike === 'object' ? classLike : {};

  // If explicit display_name exists and doesn't contain 'Form', use it
  if (isPresent(value.display_name) && !/^\s*form\s+/i.test(String(value.display_name))) {
    // If it has display_name like "Grade 7 Simba", preserve it
    const trimmed = String(value.display_name).trim();
    if (trimmed && !/form/i.test(trimmed)) {
      return trimmed;
    }
  }

  let levelLabel = 'Grade';
  if (isPresent(value.class_type)) {
    const rawType = String(value.class_type).trim();
    if (!/^form$/i.test(rawType)) {
      levelLabel = rawType;
    }
  }

  let levelValue = isPresent(value.grade_level) ? value.grade_level : null;

  // Migrate legacy form_level: Form 1-4 corresponds to Grade 9-12 in secondary institutions
  if (!isPresent(levelValue) && isPresent(value.form_level)) {
    const numericForm = Number(value.form_level);
    if (!isNaN(numericForm) && numericForm >= 1 && numericForm <= 4) {
      levelValue = numericForm + 8; // Form 1 -> Grade 9, Form 2 -> Grade 10, Form 3 -> Grade 11, Form 4 -> Grade 12
    } else {
      levelValue = value.form_level;
    }
  }

  // Handle Early Years naming if level_number is 0 or -1
  if (levelValue === 0 || String(levelValue).toLowerCase() === 'pp1') {
    levelLabel = 'PP1';
    levelValue = '';
  } else if (levelValue === -1 || String(levelValue).toLowerCase() === 'playgroup') {
    levelLabel = 'Playgroup';
    levelValue = '';
  } else if (String(levelValue).toLowerCase() === 'pp2') {
    levelLabel = 'PP2';
    levelValue = '';
  }

  const stream = isPresent(value.stream) ? String(value.stream).trim() : '';
  const levelPart = isPresent(levelValue) ? `${levelLabel} ${levelValue}` : levelLabel;
  const pieces = [levelPart, stream].filter(Boolean);

  return pieces.join(' ').trim() || (isPresent(value.name) ? String(value.name).trim() : null);
}

module.exports = {
  buildClassLabel,
  formatClassLabel: buildClassLabel,
};
