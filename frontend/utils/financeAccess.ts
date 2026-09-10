const FINANCE_DASHBOARD_ROLES = [
  'admin',
  'school_admin',
  'platform_admin',
  'bursary',
  'master_admin',
] as const;

const normalizeRole = (value: unknown): string | null => {
  const role = String(value || '').trim().toLowerCase();
  if (!role) return null;
  if (role === 'bursar') return 'bursary';
  return role;
};

const expandRoleAliases = (value: unknown): string[] => {
  const normalized = normalizeRole(value);
  if (!normalized) return [];

  const expanded = new Set<string>([normalized]);

  if (normalized === 'admin') expanded.add('school_admin');
  if (normalized === 'school_admin') expanded.add('admin');

  if (normalized === 'master_admin') expanded.add('platform_admin');
  if (normalized === 'platform_admin') expanded.add('master_admin');

  return Array.from(expanded);
};

type FinanceAccessInput = {
  activeRole?: string | null;
  role?: string | null;
  canonicalRole?: string | null;
  availableRoles?: string[] | null;
  customRoles?: string[] | null;
};

export const hasFinanceDashboardAccess = (input: FinanceAccessInput): boolean => {
  const allowed = new Set<string>();
  FINANCE_DASHBOARD_ROLES.forEach((role) => {
    expandRoleAliases(role).forEach((alias) => allowed.add(alias));
  });

  const candidateRoles = new Set<string>();
  const addRole = (value: unknown) => {
    expandRoleAliases(value).forEach((alias) => candidateRoles.add(alias));
  };

  addRole(input.activeRole);
  addRole(input.role);
  addRole(input.canonicalRole);
  (input.availableRoles || []).forEach(addRole);
  (input.customRoles || []).forEach(addRole);

  for (const role of candidateRoles) {
    if (allowed.has(role)) return true;
  }

  return false;
};
