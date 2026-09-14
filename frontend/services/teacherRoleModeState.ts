export type TeacherRoleMode = 'subject' | 'class' | 'librarian' | 'finance' | 'hod';

export const TEACHER_ROLE_MODE_KEY = 'teacher_active_mode';

// In-memory state for immediate synchronization across mounted screens without circular imports
let currentMode: TeacherRoleMode = 'subject';
let currentRoles: string[] = [];
let isInitialized = false;
const listeners = new Set<() => void>();

export function getActiveTeacherRoleMode(): TeacherRoleMode {
  return currentMode;
}

export function setActiveTeacherRoleModeInMemory(mode: TeacherRoleMode): void {
  currentMode = mode;
  notifyListeners();
}

export function getTeacherRolesInMemory(): string[] {
  return currentRoles;
}

export function setTeacherRolesInMemory(roles: string[]): void {
  currentRoles = roles;
  notifyListeners();
}

export function isTeacherRoleModeInitialized(): boolean {
  return isInitialized;
}

export function setTeacherRoleModeInitialized(val: boolean): void {
  isInitialized = val;
  notifyListeners();
}

export function subscribeTeacherRoleMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[teacherRoleModeState] Listener error:', e);
    }
  });
}
