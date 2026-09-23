export interface ClassLabelSource {
  id?: string;
  name?: string | null;
  display_name?: string | null;
  class_type?: string | null;
  grade_level?: string | number | null;
  education_level?: string | null;
  cbc_band?: string | null;
  form_level?: string | number | null;
  stream?: string | null;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

/**
 * Format human-readable class label conforming strictly to CBC baseline.
 * Plain language: Playgroup, PP1, PP2, Grade 1-12.
 * Eliminates 8-4-4 'Form' terminology.
 */
export function formatClassLabel(source?: ClassLabelSource | null): string {
  if (!source) return '';

  // If explicit display_name exists and doesn't contain 'Form', sanitize and use it
  const displayName = source.display_name || source.name;
  if (hasValue(displayName) && !/^\s*form\s+/i.test(String(displayName))) {
    let trimmed = String(displayName).trim();
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
  if (hasValue(source.class_type)) {
    const rawType = String(source.class_type).trim();
    if (!/^form$/i.test(rawType)) {
      levelLabel = rawType;
    }
  }

  let levelValue: string | number = hasValue(source.grade_level) ? source.grade_level! : '';

  // Migrate legacy form_level: Form 1-4 corresponds to Grade 9-12
  if (!hasValue(levelValue) && hasValue(source.form_level)) {
    const numericForm = Number(source.form_level);
    if (!isNaN(numericForm) && numericForm >= 1 && numericForm <= 4) {
      levelValue = numericForm + 8; // Form 1 -> Grade 9, Form 2 -> Grade 10, Form 3 -> Grade 11, Form 4 -> Grade 12
    } else {
      levelValue = source.form_level!;
    }
  }

  // Handle Early Years: Playgroup (-2), PP1 (-1), PP2 (0)
  const strVal = hasValue(levelValue) ? String(levelValue).trim().toLowerCase() : '';
  const numVal = hasValue(levelValue) ? Number(levelValue) : NaN;

  if (numVal === -2 || strVal === 'playgroup' || strVal === 'pg' || strVal === 'play group') {
    levelLabel = 'Playgroup';
    levelValue = '';
  } else if (numVal === -1 || strVal === 'pp1' || strVal === 'pre-primary 1' || strVal === 'pre primary 1') {
    levelLabel = 'PP1';
    levelValue = '';
  } else if ((hasValue(levelValue) && (numVal === 0 || strVal === '0')) || strVal === 'pp2' || strVal === 'pre-primary 2' || strVal === 'pre primary 2') {
    levelLabel = 'PP2';
    levelValue = '';
  }

  const isEarlyYears = (levelLabel === 'Playgroup' || levelLabel === 'PP1' || levelLabel === 'PP2');
  let levelPart = '';
  if (isEarlyYears) {
    levelPart = levelLabel;
  } else if (hasValue(levelValue)) {
    levelPart = `${levelLabel} ${levelValue}`;
  } else if (hasValue(source.stream) && hasValue(source.class_type)) {
    levelPart = levelLabel;
  }

  const stream = hasValue(source.stream) ? String(source.stream).trim() : '';

  const label = [levelPart, stream].filter(Boolean).join(' ').trim();

  if (label) return label;
  if (hasValue(source.name)) {
    return String(source.name).trim()
      .replace(/^grade\s*-2\b/i, 'Playgroup')
      .replace(/^grade\s*-1\b/i, 'PP1')
      .replace(/^grade\s*0\b/i, 'PP2');
  }
  if (hasValue(source.id)) return String(source.id).trim();
  return '';
}
