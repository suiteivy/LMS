function isPresent(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function buildClassLabel(classLike = {}) {
  const value = classLike && typeof classLike === 'object' ? classLike : {};

  const levelLabel = isPresent(value.class_type)
    ? String(value.class_type).trim()
    : isPresent(value.form_level)
      ? 'Form'
      : 'Grade';

  const levelValue = levelLabel === 'Form'
    ? value.form_level
    : (isPresent(value.grade_level) ? value.grade_level : value.form_level);

  const stream = isPresent(value.stream) ? String(value.stream).trim() : '';
  const pieces = [
    isPresent(levelValue) ? `${levelLabel} ${levelValue}` : '',
    stream,
  ].filter(Boolean);

  return pieces.join(' ').trim() || null;
}

module.exports = {
  buildClassLabel,
};
