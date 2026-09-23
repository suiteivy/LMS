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

  // If explicit display_name exists and doesn't contain 'Form', sanitize and use it
  if (isPresent(value.display_name) && !/^\s*form\s+/i.test(String(value.display_name))) {
    let trimmed = String(value.display_name).trim();
    // Sanitize buggy/legacy Early Years prefixes
    trimmed = trimmed
      .replace(/^grade\s*-2\b/i, 'Playgroup')
      .replace(/^grade\s*-1\b/i, 'PP1')
      .replace(/^grade\s*0\b/i, 'PP2');

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

  // Handle Early Years: Playgroup (-2), PP1 (-1), PP2 (0)
  const strVal = isPresent(levelValue) ? String(levelValue).trim().toLowerCase() : '';
  const numVal = isPresent(levelValue) ? Number(levelValue) : NaN;

  if (numVal === -2 || strVal === 'playgroup' || strVal === 'pg' || strVal === 'play group') {
    levelLabel = 'Playgroup';
    levelValue = '';
  } else if (numVal === -1 || strVal === 'pp1' || strVal === 'pre-primary 1' || strVal === 'pre primary 1') {
    levelLabel = 'PP1';
    levelValue = '';
  } else if ((isPresent(levelValue) && (numVal === 0 || strVal === '0')) || strVal === 'pp2' || strVal === 'pre-primary 2' || strVal === 'pre primary 2') {
    levelLabel = 'PP2';
    levelValue = '';
  }

  const isEarlyYears = (levelLabel === 'Playgroup' || levelLabel === 'PP1' || levelLabel === 'PP2');
  let levelPart = '';
  if (isEarlyYears) {
    levelPart = levelLabel;
  } else if (isPresent(levelValue)) {
    levelPart = `${levelLabel} ${levelValue}`;
  } else if (isPresent(value.stream) && isPresent(value.class_type)) {
    levelPart = levelLabel;
  }

  const stream = isPresent(value.stream) ? String(value.stream).trim() : '';
  const pieces = [levelPart, stream].filter(Boolean);

  const finalLabel = pieces.join(' ').trim();
  if (finalLabel) return finalLabel;

  if (isPresent(value.name)) {
    return String(value.name).trim()
      .replace(/^grade\s*-2\b/i, 'Playgroup')
      .replace(/^grade\s*-1\b/i, 'PP1')
      .replace(/^grade\s*0\b/i, 'PP2');
  }

  return null;
}

module.exports = {
  buildClassLabel,
  formatClassLabel: buildClassLabel,
};
