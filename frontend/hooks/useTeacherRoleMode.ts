import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { TeacherAPI } from '@/services/TeacherService';
import { CacheService } from '@/services/CacheService';

export type TeacherRoleMode = 'subject' | 'class' | 'librarian';

export const TEACHER_ROLE_MODE_KEY = 'teacher_active_mode';

// In-memory state for immediate synchronization across mounted screens
let currentMode: TeacherRoleMode = 'subject';
let currentRoles: string[] = [];
let isInitialized = false;
const listeners = new Set<() => void>();

function getFallbackMode(roles: string[], isLibrarianAuth: boolean): TeacherRoleMode {
  const hasSubject = roles.includes('Subject Teacher');
  const hasClass = roles.includes('Class Teacher');
  const hasLibrarian = isLibrarianAuth || roles.includes('Librarian');

  if (hasSubject) return 'subject';
  if (hasClass) return 'class';
  if (hasLibrarian) return 'librarian';
  return 'subject';
}

function isModeAllowed(mode: TeacherRoleMode, roles: string[], isLibrarianAuth: boolean): boolean {
  if (mode === 'subject') return roles.includes('Subject Teacher');
  if (mode === 'class') return roles.includes('Class Teacher');
  return isLibrarianAuth || roles.includes('Librarian');
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function useTeacherRoleMode() {
  const { teacherId, session, isDemo, isLibrarian: isLibrarianAuth } = useAuth();
  const [mode, setLocalMode] = useState<TeacherRoleMode>(currentMode);
  const [roles, setLocalRoles] = useState<string[]>(currentRoles);
  const [loading, setLoading] = useState<boolean>(!isInitialized);

  // Subscribe to changes from other screens/instances
  useEffect(() => {
    const handleUpdate = () => {
      setLocalMode(currentMode);
      setLocalRoles(currentRoles);
      setLoading(false);
    };

    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  // Initialize roles and saved mode
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // 1. Load saved mode from AsyncStorage
        const savedMode = await AsyncStorage.getItem(TEACHER_ROLE_MODE_KEY);
        if (savedMode === 'subject' || savedMode === 'class' || savedMode === 'librarian') {
          currentMode = savedMode;
        }

        // 2. Demo mode mock roles
        if (isDemo) {
          currentRoles = ['Subject Teacher', 'Class Teacher', 'Head of Department'];
          isInitialized = true;
          if (isMounted) {
            setLocalMode(currentMode);
            setLocalRoles(currentRoles);
            setLoading(false);
          }
          notifyListeners();
          return;
        }

        // 3. Try to hydrate roles from cache first
        const cacheKey = teacherId ? `teacher_dashboard_${teacherId}` : null;
        if (cacheKey) {
          const cached = await CacheService.get<any>(cacheKey, { allowStale: true });
          if (cached?.data?.roles) {
            currentRoles = cached.data.roles;
            const fallback = getFallbackMode(currentRoles, isLibrarianAuth);
            if (!isModeAllowed(currentMode, currentRoles, isLibrarianAuth)) {
              currentMode = fallback;
            }
            isInitialized = true;
            if (isMounted) {
              setLocalMode(currentMode);
              setLocalRoles(currentRoles);
              setLoading(false);
            }
            notifyListeners();
          }
        }

        // 4. Fetch fresh roles if not yet available
        if (session && (!currentRoles.length || !isInitialized)) {
          const data = await TeacherAPI.getDashboardStats();
          const fetchedRoles = data?.roles || [];
          currentRoles = fetchedRoles;

          const fallback = getFallbackMode(fetchedRoles, isLibrarianAuth);
          if (!isModeAllowed(currentMode, fetchedRoles, isLibrarianAuth)) {
            currentMode = fallback;
          }
          isInitialized = true;
          if (isMounted) {
            setLocalMode(currentMode);
            setLocalRoles(currentRoles);
            setLoading(false);
          }
          notifyListeners();
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
  }, [teacherId, session, isDemo, isLibrarianAuth]);

  // Set mode, persist to AsyncStorage, and notify all hook consumers
  const setMode = useCallback((newMode: TeacherRoleMode) => {
    const nextMode = isModeAllowed(newMode, currentRoles, isLibrarianAuth)
      ? newMode
      : getFallbackMode(currentRoles, isLibrarianAuth);

    currentMode = nextMode;
    setLocalMode(nextMode);
    AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, nextMode).catch((err) => {
      console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
    });
    notifyListeners();
  }, [isLibrarianAuth]);

  // Update roles in memory and sync listeners
  const syncRoles = useCallback((newRoles: string[]) => {
    currentRoles = newRoles;
    setLocalRoles(newRoles);
    if (!isModeAllowed(currentMode, newRoles, isLibrarianAuth)) {
      currentMode = getFallbackMode(newRoles, isLibrarianAuth);
      setLocalMode(currentMode);
      AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, currentMode).catch((err) => {
        console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
      });
    }
    isInitialized = true;
    notifyListeners();
  }, [isLibrarianAuth]);

  const isClassTeacher = roles.includes('Class Teacher');
  const isSubjectTeacher = roles.includes('Subject Teacher');
  const isLibrarian = isLibrarianAuth || roles.includes('Librarian');

  const fallbackMode = getFallbackMode(roles, isLibrarianAuth);
  const modeAllowed = isModeAllowed(mode, roles, isLibrarianAuth);
  const effectiveMode: TeacherRoleMode = modeAllowed ? mode : fallbackMode;

  useEffect(() => {
    if (loading || modeAllowed) return;

    currentMode = effectiveMode;
    setLocalMode(effectiveMode);
    AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, effectiveMode).catch((err) => {
      console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
    });
    notifyListeners();
  }, [loading, modeAllowed, effectiveMode]);
  
  // At least 2 roles available to toggle modes
  const activeRoleCount = (isClassTeacher ? 1 : 0) + (isSubjectTeacher ? 1 : 0) + (isLibrarian ? 1 : 0);
  const canToggle = activeRoleCount >= 2;

  return {
    mode: effectiveMode,
    setMode,
    roles,
    syncRoles,
    isClassTeacher,
    isSubjectTeacher,
    isLibrarian,
    canToggle,
    loading,
  };
}
