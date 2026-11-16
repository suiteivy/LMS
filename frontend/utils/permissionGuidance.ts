/**
 * Plain-Language Glossary, Tooltips and Summary Sentence Generator
 * Implements Section 7A and 7B of LMS Roles & Access Restructure
 */

export interface GlossaryTerm {
  label: string;
  explanation: string;
}

export const PLAIN_GLOSSARY: Record<string, GlossaryTerm> = {
  domain: {
    label: 'Area',
    explanation: 'A part of the school system, like Finance or Students.',
  },
  role: {
    label: 'Job role',
    explanation: 'A set of permissions for a job, like Finance Manager.',
  },
  role_template: {
    label: 'Ready-made role',
    explanation: 'A starting point you can use as is or change.',
  },
  scope: {
    label: 'What they can see',
    explanation: 'Limit by class, grade, term, or type of record.',
  },
  field_hiding: {
    label: 'Hide private details',
    explanation: 'Hide things like phone numbers or ID numbers.',
  },
  explicit_deny: {
    label: 'Block this access',
    explanation: 'Blocks one thing even if a role allows it.',
  },
  delegation_ceiling: {
    label: 'Access ceiling',
    explanation: 'You can only give access you have yourself.',
  },
  step_up_auth: {
    label: "Confirm it's you",
    explanation: 'Please re-enter your password or verify device biometrics for this important change.',
  },
  effective_permissions: {
    label: 'What this person can do',
    explanation: 'The combined result of all their job roles.',
  },
  designation: {
    label: 'Extra duty',
    explanation: 'An extra responsibility, such as Librarian.',
  },
  audit_log: {
    label: 'Activity history',
    explanation: 'Who did what, and when.',
  },
};

export const ACTION_LABELS: Record<string, { label: string; explanation: string }> = {
  view: { label: 'See', explanation: 'Can read information on screen in this area.' },
  create: { label: 'Add', explanation: 'Can add new records in this area.' },
  edit: { label: 'Change', explanation: 'Can edit existing records in this area.' },
  delete: { label: 'Remove', explanation: 'Can delete or archive records in this area.' },
  approve: { label: 'Approve requests', explanation: 'Can approve things like fee waivers, leave, or changes.' },
  generate_report: { label: 'Create reports', explanation: 'Can build and view a report on screen.' },
  download_report: { label: 'Download reports', explanation: 'Can save reports to device as PDF or file.' },
  export_data: { label: 'Export lists', explanation: 'Can save lists (e.g. students) as an Excel/CSV file.' },
  manage_roles: { label: 'Give access to others', explanation: 'Can choose what other staff can do in the system.' },
};

export const DOMAIN_LABELS: Record<string, string> = {
  academic: 'Academic & Curriculum',
  students: 'Students',
  parents: 'Parents',
  teachers_staff: 'Teachers & Staff',
  finance: 'Finance & Fees',
  reports: 'Reports',
  library: 'Library',
  communication: 'Messages & Notices',
  attendance: 'Attendance',
  timetable: 'Timetable',
  settings: 'School Settings',
  roles_access: 'Roles & Access',
  audit_logs: 'Activity History',
};

/**
 * Auto-generates a concise, plain-English summary sentence from permissions.
 * Example: "Can see everything. Can manage Finance and create financial reports. Cannot download reports outside Finance."
 */
export function generatePermissionSummary(
  permissions: Record<string, Record<string, { granted: boolean; sources?: string[] }>> | Array<{ domain: string; action: string }>,
  isMainAdmin: boolean = false
): string {
  if (isMainAdmin) {
    return 'Full unrestricted administrative access over the entire institution. Can manage all areas, staff roles, and settings.';
  }

  // Normalize into domain -> Set of actions
  const domainActions: Record<string, Set<string>> = {};

  if (Array.isArray(permissions)) {
    permissions.forEach((p) => {
      if (!domainActions[p.domain]) domainActions[p.domain] = new Set();
      domainActions[p.domain].add(p.action);
    });
  } else if (typeof permissions === 'object' && permissions !== null) {
    Object.entries(permissions).forEach(([dom, acts]) => {
      Object.entries(acts).forEach(([act, val]) => {
        if (val && val.granted) {
          if (!domainActions[dom]) domainActions[dom] = new Set();
          domainActions[dom].add(act);
        }
      });
    });
  }

  const domains = Object.keys(domainActions);
  if (domains.length === 0) {
    return 'No active system access assigned yet.';
  }

  const sentences: string[] = [];

  // Check viewing coverage
  const allKnownDomains = ['academic', 'students', 'parents', 'teachers_staff', 'finance', 'reports', 'library', 'communication', 'attendance', 'timetable'];
  const viewableDomains = domains.filter((d) => domainActions[d]?.has('view'));

  if (viewableDomains.length >= allKnownDomains.length) {
    sentences.push('Can see all school areas.');
  } else if (viewableDomains.length > 0) {
    const names = viewableDomains.map((d) => DOMAIN_LABELS[d] || d).slice(0, 3).join(', ');
    const extra = viewableDomains.length > 3 ? ` and ${viewableDomains.length - 3} more` : '';
    sentences.push(`Can see ${names}${extra}.`);
  }

  // Check editing / managing
  const editDomains = domains.filter((d) => domainActions[d]?.has('create') || domainActions[d]?.has('edit'));
  if (editDomains.length > 0) {
    const editNames = editDomains.map((d) => DOMAIN_LABELS[d] || d).slice(0, 2).join(', ');
    sentences.push(`Can edit ${editNames}.`);
  }

  // Check financial reports & general downloads
  const hasFinance = domainActions['finance']?.has('create') || domainActions['finance']?.has('edit');
  const hasReportDownloads = Object.values(domainActions).some((acts) => acts.has('download_report') || acts.has('export_data'));
  const canDownloadOutsideFinance = domains.some((d) => d !== 'finance' && (domainActions[d]?.has('download_report') || domainActions[d]?.has('export_data')));

  if (hasFinance) {
    sentences.push('Can manage student fees and financial records.');
  }

  if (domainActions['roles_access']?.has('manage_roles')) {
    sentences.push('Can give access to other staff.');
  }

  if (!hasReportDownloads) {
    sentences.push('Cannot download reports or export files.');
  } else if (!canDownloadOutsideFinance && hasFinance) {
    sentences.push('Cannot download reports outside Finance.');
  }

  return sentences.join(' ');
}

export interface RiskWarning {
  level: 'low' | 'medium' | 'high';
  title: string;
  description: string;
}

/**
 * Conflict and risk analysis for the Review step
 */
export function analyzeAccessRisks(
  permissions: Array<{ domain: string; action: string }>,
  scope: string = 'all',
  isTimeBound: boolean = false
): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const actionSet = new Set(permissions.map((p) => `${p.domain}:${p.action}`));

  const hasManageRoles = actionSet.has('roles_access:manage_roles');
  const hasFinanceEdit = actionSet.has('finance:edit') || actionSet.has('finance:create') || actionSet.has('finance:approve');
  const hasDownloads = permissions.some((p) => p.action === 'download_report' || p.action === 'export_data');
  const hasStudentExport = actionSet.has('students:export_data');

  if (hasManageRoles && hasFinanceEdit) {
    warnings.push({
      level: 'high',
      title: 'High Privilege Combination',
      description: 'This person can manage school finances AND grant access to other staff. Ensure this dual authority is intended.',
    });
  }

  if (scope === 'all' && hasStudentExport) {
    warnings.push({
      level: 'medium',
      title: 'Whole-School Data Export',
      description: 'This person will be able to download and save all student contact and identity files to their personal device.',
    });
  }

  if (hasManageRoles && !isTimeBound) {
    warnings.push({
      level: 'low',
      title: 'Permanent Role Management',
      description: 'Role management authority has no scheduled expiry date.',
    });
  }

  return warnings;
}

export const generatePlainEnglishSummary = (
  permissions: any,
  options?: { data_scope?: string; levels?: string[] }
): string => {
  const base = generatePermissionSummary(permissions);
  if (options?.data_scope === 'levels' && options.levels && options.levels.length > 0) {
    return `${base} Scoped to ${options.levels.join(', ')}.`;
  }
  return base;
};

export const analyzePermissionRisks = (
  permissions: Array<{ domain: string; action: string }>,
  scope: string = 'all'
) => {
  return analyzeAccessRisks(permissions, scope).map(r => ({
    level: r.level,
    title: r.title,
    message: `${r.title}: ${r.description}`
  }));
};
