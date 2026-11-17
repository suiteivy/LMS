/**
 * Standard person identifier formatting utilities
 * Scoped strictly to:
 * - Student: Admission number (4+ digits, e.g. 0001, 1000)
 * - Staff: Staff number (ST + 4+ digits, e.g. ST0001)
 * - Parent: Parent number (PA + 4+ digits, e.g. PA0001)
 */

export type PersonType = 'student' | 'staff' | 'teacher' | 'admin' | 'parent';

export interface PersonIdentifierEntity {
  id?: string;
  role?: string;
  person_type?: string;
  admission_number?: string | null;
  staff_number?: string | null;
  parent_number?: string | null;
  number_value?: number | null;
  // Fallbacks for nested objects
  students?: { admission_number?: string | null; number_value?: number | null } | Array<{ admission_number?: string | null }>;
  teachers?: { staff_number?: string | null; number_value?: number | null } | Array<{ staff_number?: string | null }>;
  admins?: { staff_number?: string | null; number_value?: number | null } | Array<{ staff_number?: string | null }>;
  parents?: { parent_number?: string | null; number_value?: number | null } | Array<{ parent_number?: string | null }>;
  student?: { admission_number?: string | null; number_value?: number | null };
}

/**
 * Returns the plain-language UI label for the identifier type.
 */
export function getPersonNumberLabel(type?: PersonType | string): string {
  const norm = String(type || '').toLowerCase();
  if (norm === 'student') return 'Admission number';
  if (norm === 'teacher' || norm === 'staff' || norm === 'admin' || norm === 'readonly_admin') return 'Staff number';
  if (norm === 'parent') return 'Parent number';
  return 'Identifier';
}

/**
 * Formats a person's display number according to platform standards.
 * Never outputs raw legacy codes (STU-, TEA-, etc.) or UUIDs.
 */
export function formatPersonNumber(
  entity: PersonIdentifierEntity | string | null | undefined,
  preferredType?: PersonType | string,
  fallback = '—'
): string {
  if (!entity) return fallback;

  if (typeof entity === 'string') {
    return cleanFormattedNumber(entity, preferredType);
  }

  const role = String(preferredType || entity.role || entity.person_type || '').toLowerCase();

  // 1. Direct explicit fields
  if (entity.admission_number && (role === 'student' || !role)) {
    return cleanFormattedNumber(entity.admission_number, 'student');
  }
  if (entity.staff_number && (role === 'teacher' || role === 'staff' || role === 'admin' || !role)) {
    return cleanFormattedNumber(entity.staff_number, 'staff');
  }
  if (entity.parent_number && (role === 'parent' || !role)) {
    return cleanFormattedNumber(entity.parent_number, 'parent');
  }

  // 2. Nested relationships
  if (entity.student?.admission_number) {
    return cleanFormattedNumber(entity.student.admission_number, 'student');
  }
  const nestedStu = Array.isArray(entity.students) ? entity.students[0] : entity.students;
  if (nestedStu?.admission_number) {
    return cleanFormattedNumber(nestedStu.admission_number, 'student');
  }

  const nestedTch = Array.isArray(entity.teachers) ? entity.teachers[0] : entity.teachers;
  if (nestedTch?.staff_number) {
    return cleanFormattedNumber(nestedTch.staff_number, 'staff');
  }

  const nestedAdm = Array.isArray(entity.admins) ? entity.admins[0] : entity.admins;
  if (nestedAdm?.staff_number) {
    return cleanFormattedNumber(nestedAdm.staff_number, 'staff');
  }

  const nestedPar = Array.isArray(entity.parents) ? entity.parents[0] : entity.parents;
  if (nestedPar?.parent_number) {
    return cleanFormattedNumber(nestedPar.parent_number, 'parent');
  }

  // 3. If number_value is provided
  if (typeof entity.number_value === 'number' && entity.number_value > 0) {
    const padded = String(entity.number_value).padStart(4, '0');
    if (role === 'student') return padded;
    if (role === 'parent') return `PA${padded}`;
    if (role === 'teacher' || role === 'staff' || role === 'admin') return `ST${padded}`;
    return padded;
  }

  return fallback;
}

/**
 * Normalizes and strips old code prefixes if lingering in transient state
 */
function cleanFormattedNumber(raw: string, type?: PersonType | string): string {
  const trimmed = String(raw).trim();
  // If it's a legacy STU- code (e.g. STU-001 or STU-2026-0001), normalize digits if possible or present cleanly
  if (/^STU-/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 0) {
      return digits.slice(-4).padStart(4, '0');
    }
  }
  if (/^(TEA|TCH)-/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 0) {
      return `ST${digits.slice(-4).padStart(4, '0')}`;
    }
  }
  if (/^PAR-/i.test(trimmed)) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length > 0) {
      return `PA${digits.slice(-4).padStart(4, '0')}`;
    }
  }
  return trimmed;
}
