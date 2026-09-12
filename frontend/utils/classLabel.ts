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

  // If explicit display_name exists and doesn't contain 'Form', use it
  const displayName = source.display_name || source.name;
  if (hasValue(displayName) && !/^\s*form\s+/i.test(String(displayName))) {
    const trimmed = String(displayName).trim();
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

  // Handle Early Years
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

  const stream = hasValue(source.stream) ? String(source.stream).trim() : '';
  const levelPart = hasValue(levelValue) ? `${levelLabel} ${levelValue}` : levelLabel;

  const label = [levelPart, stream].filter(Boolean).join(' ').trim();

  if (label) return label;
  if (hasValue(source.name)) return String(source.name).trim();
  if (hasValue(source.id)) return String(source.id).trim();
  return '';
}
