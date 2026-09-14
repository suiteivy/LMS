import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherAPI } from '@/services/TeacherService';
import { CacheService } from '@/services/CacheService';
import {
  TeacherRoleMode,
  TEACHER_ROLE_MODE_KEY,
  getActiveTeacherRoleMode,
  setActiveTeacherRoleModeInMemory,
  getTeacherRolesInMemory,
  setTeacherRolesInMemory,
  isTeacherRoleModeInitialized,
  setTeacherRoleModeInitialized,
  subscribeTeacherRoleMode,
} from '@/services/teacherRoleModeState';

export { TeacherRoleMode, TEACHER_ROLE_MODE_KEY, getActiveTeacherRoleMode };

function getFallbackMode(roles: string[], isLibrarianAuth: boolean, isFinanceAdminAuth: boolean = false): TeacherRoleMode {
  const hasSubject = roles.includes('Subject Teacher');
  const hasClass = roles.includes('Class Teacher');
  const hasHOD = roles.includes('Head of Department') || roles.includes('HOD');
  const hasLibrarian = isLibrarianAuth || roles.includes('Librarian');
  const hasFinance = isFinanceAdminAuth || roles.includes('Finance Administrator') || roles.includes('Finance Admin');

  if (hasSubject) return 'subject';
  if (hasClass) return 'class';
  if (hasHOD) return 'hod';
  if (hasLibrarian) return 'librarian';
  if (hasFinance) return 'finance';
  return 'subject';
}

function isModeAllowed(mode: TeacherRoleMode, roles: string[], isLibrarianAuth: boolean, isFinanceAdminAuth: boolean = false): boolean {
  if (mode === 'subject') return roles.includes('Subject Teacher');
  if (mode === 'class') return roles.includes('Class Teacher');
  if (mode === 'hod') return roles.includes('Head of Department') || roles.includes('HOD');
  if (mode === 'librarian') return isLibrarianAuth || roles.includes('Librarian');
  if (mode === 'finance') return isFinanceAdminAuth || roles.includes('Finance Administrator') || roles.includes('Finance Admin');
  return false;
}

export function useTeacherRoleMode() {
  const { teacherId, session, isDemo, isLibrarian: isLibrarianAuth, isFinanceAdmin: isFinanceAdminAuth } = useAuth();
  const [mode, setLocalMode] = useState<TeacherRoleMode>(getActiveTeacherRoleMode());
  const [roles, setLocalRoles] = useState<string[]>(getTeacherRolesInMemory());
  const [loading, setLoading] = useState<boolean>(!isTeacherRoleModeInitialized());

  // Subscribe to changes from other screens/instances
  useEffect(() => {
    const handleUpdate = () => {
      setLocalMode(getActiveTeacherRoleMode());
      setLocalRoles(getTeacherRolesInMemory());
      setLoading(false);
    };

    const unsubscribe = subscribeTeacherRoleMode(handleUpdate);
    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize roles and saved mode
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // 1. Load saved mode from AsyncStorage
        const savedMode = await AsyncStorage.getItem(TEACHER_ROLE_MODE_KEY);
        if (savedMode === 'subject' || savedMode === 'class' || savedMode === 'librarian' || savedMode === 'finance') {
          setActiveTeacherRoleModeInMemory(savedMode as TeacherRoleMode);
        }

        // 2. Demo mode mock roles
        if (isDemo) {
          const demoRoles = ['Subject Teacher', 'Class Teacher', 'Head of Department'];
          setTeacherRolesInMemory(demoRoles);
          setTeacherRoleModeInitialized(true);
          if (isMounted) {
            setLocalMode(getActiveTeacherRoleMode());
            setLocalRoles(demoRoles);
            setLoading(false);
          }
          return;
        }

        // 3. Try to hydrate roles from cache first
        const cacheKey = teacherId ? `teacher_dashboard_${teacherId}` : null;
        if (cacheKey) {
          const cached = await CacheService.get<any>(cacheKey, { allowStale: true });
          if (cached?.data?.roles) {
            const cachedRoles = cached.data.roles;
            setTeacherRolesInMemory(cachedRoles);
            const fallback = getFallbackMode(cachedRoles, isLibrarianAuth, isFinanceAdminAuth);
            if (!isModeAllowed(getActiveTeacherRoleMode(), cachedRoles, isLibrarianAuth, isFinanceAdminAuth)) {
              setActiveTeacherRoleModeInMemory(fallback);
            }
            setTeacherRoleModeInitialized(true);
            if (isMounted) {
              setLocalMode(getActiveTeacherRoleMode());
              setLocalRoles(cachedRoles);
              setLoading(false);
            }
          }
        }

        // 4. Fetch fresh roles if not yet available
        const curRoles = getTeacherRolesInMemory();
        if (session && (!curRoles.length || !isTeacherRoleModeInitialized())) {
          const data = await TeacherAPI.getDashboardStats();
          const fetchedRoles = data?.roles || [];
          setTeacherRolesInMemory(fetchedRoles);

          const fallback = getFallbackMode(fetchedRoles, isLibrarianAuth, isFinanceAdminAuth);
          if (!isModeAllowed(getActiveTeacherRoleMode(), fetchedRoles, isLibrarianAuth, isFinanceAdminAuth)) {
            setActiveTeacherRoleModeInMemory(fallback);
          }
          setTeacherRoleModeInitialized(true);
          if (isMounted) {
            setLocalMode(getActiveTeacherRoleMode());
            setLocalRoles(fetchedRoles);
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn('[useTeacherRoleMode] Failed to initialize role mode:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [teacherId, session, isDemo, isLibrarianAuth, isFinanceAdminAuth]);

  // Set mode, persist to AsyncStorage, and notify all hook consumers
  const setMode = useCallback((newMode: TeacherRoleMode) => {
    const curRoles = getTeacherRolesInMemory();
    const nextMode = isModeAllowed(newMode, curRoles, isLibrarianAuth, isFinanceAdminAuth)
      ? newMode
      : getFallbackMode(curRoles, isLibrarianAuth, isFinanceAdminAuth);

    setActiveTeacherRoleModeInMemory(nextMode);
    setLocalMode(nextMode);
    AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, nextMode).catch((err) => {
      console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
    });
  }, [isLibrarianAuth, isFinanceAdminAuth]);

  // Update roles in memory and sync listeners
  const syncRoles = useCallback((newRoles: string[]) => {
    setTeacherRolesInMemory(newRoles);
    setLocalRoles(newRoles);
    const curMode = getActiveTeacherRoleMode();
    if (!isModeAllowed(curMode, newRoles, isLibrarianAuth, isFinanceAdminAuth)) {
      const fallback = getFallbackMode(newRoles, isLibrarianAuth, isFinanceAdminAuth);
      setActiveTeacherRoleModeInMemory(fallback);
      setLocalMode(fallback);
      AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, fallback).catch((err) => {
        console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
      });
    }
    setTeacherRoleModeInitialized(true);
  }, [isLibrarianAuth, isFinanceAdminAuth]);

  const isClassTeacher = roles.includes('Class Teacher');
  const isSubjectTeacher = roles.includes('Subject Teacher');
  const isHOD = roles.includes('Head of Department') || roles.includes('HOD');
  const isLibrarian = isLibrarianAuth || roles.includes('Librarian');
  const isFinanceAdmin = isFinanceAdminAuth || roles.includes('Finance Administrator') || roles.includes('Finance Admin');

  const fallbackMode = getFallbackMode(roles, isLibrarianAuth, isFinanceAdminAuth);
  const modeAllowed = isModeAllowed(mode, roles, isLibrarianAuth, isFinanceAdminAuth);
  const effectiveMode: TeacherRoleMode = modeAllowed ? mode : fallbackMode;

  useEffect(() => {
    if (loading || modeAllowed) return;

    setActiveTeacherRoleModeInMemory(effectiveMode);
    setLocalMode(effectiveMode);
    AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, effectiveMode).catch((err) => {
      console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
    });
  }, [loading, modeAllowed, effectiveMode]);
  
  // At least 2 roles available to toggle modes
  const activeRoleCount = (isClassTeacher ? 1 : 0) + (isSubjectTeacher ? 1 : 0) + (isHOD ? 1 : 0) + (isLibrarian ? 1 : 0) + (isFinanceAdmin ? 1 : 0);
  const canToggle = activeRoleCount >= 2;

  return {
    mode: effectiveMode,
    setMode,
    roles,
    syncRoles,
    isClassTeacher,
    isSubjectTeacher,
    isHOD,
    isLibrarian,
    isFinanceAdmin,
    canToggle,
    loading,
  };
}
