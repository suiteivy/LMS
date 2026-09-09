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
            // If only Class Teacher and not Subject Teacher, default to class mode
            if (!currentRoles.includes('Subject Teacher') && currentRoles.includes('Class Teacher')) {
              currentMode = 'class';
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

          if (!fetchedRoles.includes('Subject Teacher') && fetchedRoles.includes('Class Teacher')) {
            currentMode = 'class';
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
  }, [teacherId, session, isDemo]);

  // Set mode, persist to AsyncStorage, and notify all hook consumers
  const setMode = useCallback((newMode: TeacherRoleMode) => {
    currentMode = newMode;
    setLocalMode(newMode);
    AsyncStorage.setItem(TEACHER_ROLE_MODE_KEY, newMode).catch((err) => {
      console.warn('[useTeacherRoleMode] Failed to persist role mode:', err);
    });
    notifyListeners();
  }, []);

  // Update roles in memory and sync listeners
  const syncRoles = useCallback((newRoles: string[]) => {
    currentRoles = newRoles;
    setLocalRoles(newRoles);
    if (!newRoles.includes('Subject Teacher') && newRoles.includes('Class Teacher')) {
      currentMode = 'class';
      setLocalMode('class');
    }
    isInitialized = true;
    notifyListeners();
  }, []);

  const isClassTeacher = roles.includes('Class Teacher');
  const isSubjectTeacher = roles.includes('Subject Teacher');
  const isLibrarian = isLibrarianAuth || roles.includes('Librarian');
  
  // At least 2 roles available to toggle modes
  const activeRoleCount = (isClassTeacher ? 1 : 0) + (isSubjectTeacher ? 1 : 0) + (isLibrarian ? 1 : 0);
  const canToggle = activeRoleCount >= 2;

  return {
    mode,
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
