export interface ClassLabelSource {
  id?: string;
  name?: string | null;
  level_label?: string | null;
  grade_level?: string | number | null;
  form_level?: string | number | null;
  stream?: string | null;
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function formatClassLabel(source?: ClassLabelSource | null): string {
  if (!source) return '';

  const levelLabel = hasValue(source.level_label)
    ? String(source.level_label).trim()
    : hasValue(source.form_level)
      ? 'Form'
      : 'Grade';

  const levelValue = levelLabel === 'Form'
    ? source.form_level
    : (hasValue(source.grade_level) ? source.grade_level : source.form_level);

  const stream = hasValue(source.stream) ? String(source.stream).trim() : '';

  const label = [
    hasValue(levelValue) ? `${levelLabel} ${levelValue}` : '',
    stream,
  ].filter(Boolean).join(' ').trim();

  if (label) return label;
  if (hasValue(source.name)) return String(source.name).trim();
  if (hasValue(source.id)) return String(source.id).trim();
  return '';
}
