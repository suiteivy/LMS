const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const first = (x: any) => (Array.isArray(x) ? x[0] : x);
const nonUuid = (v: any) => (v && !UUID_REGEX.test(String(v)) ? String(v) : null);

/**
 * Resolves the human-facing ID for a user row that was fetched with the
 * students / teachers / admins / parents relations.
 */
export function resolveDisplayId(u: any): string | null {
  const student = first(u.students);
  const teacher = first(u.teachers);

  if (u.role === 'student' && student) {
    // admission_number IS the official student ID, even if it looks like a UUID
    return student.admission_number || student.id_number || null;
  }
  if (u.role === 'teacher' && teacher) return nonUuid(teacher.id);
  if (u.role === 'admin') return nonUuid(first(u.admins)?.id);
  if (u.role === 'parent') return nonUuid(first(u.parents)?.id);
  return null;
}