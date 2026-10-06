import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherRoleMode, type TeacherRoleMode } from '@/hooks/useTeacherRoleMode';
import { TimetableAPI, type TimetableEntry } from '@/services/TimetableService';
import { StudentService } from '@/services/StudentService';
import { ParentService } from '@/services/ParentService';
import { TeacherAPI } from '@/services/TeacherService';
import demoDummyData from '@/demoDummyData';

export interface ParentChildGroup {
  childId: string;
  childName: string;
  className: string;
  entries: TimetableEntry[];
}

export interface DayScheduleState {
  loading: boolean;
  error: string | null;
  studentEntries: TimetableEntry[];
  teacherEntries: TimetableEntry[];
  classTeacherEntries: TimetableEntry[];
  classTeacherLabel: string;
  parentChildrenGroups: ParentChildGroup[];
  refetch: () => void;
}

export function useDaySchedule(userRole?: string): DayScheduleState {
  const { profile, user, isDemo, activeRole: authActiveRole } = useAuth();
  const { mode: teacherMode } = useTeacherRoleMode();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentEntries, setStudentEntries] = useState<TimetableEntry[]>([]);
  const [teacherEntries, setTeacherEntries] = useState<TimetableEntry[]>([]);
  const [classTeacherEntries, setClassTeacherEntries] = useState<TimetableEntry[]>([]);
  const [classTeacherLabel, setClassTeacherLabel] = useState<string>('Assigned Class');
  const [parentChildrenGroups, setParentChildrenGroups] = useState<ParentChildGroup[]>([]);

  // Cache flag to prevent duplicate network calls during the same mount
  const hasLoadedRef = useRef(false);

  const effectiveRole = (
    authActiveRole ||
    userRole ||
    profile?.role ||
    user?.role ||
    'student'
  ).toLowerCase();

  const fetchSchedule = useCallback(async () => {
    // Admin, Finance, Librarian without teaching timetable don't need schedule
    const isTeacherRole = effectiveRole === 'teacher';
    const isStudentRole = effectiveRole === 'student';
    const isParentRole = effectiveRole === 'parent';

    if (!isTeacherRole && !isStudentRole && !isParentRole) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. STUDENT ROLE
      if (isStudentRole) {
        try {
          const data = await StudentService.getTimetable();
          if (Array.isArray(data) && data.length > 0) {
            setStudentEntries(data);
          } else if (isDemo) {
            setStudentEntries((demoDummyData as any).student?.fullTimetable || []);
          } else {
            setStudentEntries(data || []);
          }
        } catch (err: any) {
          if (isDemo) {
            setStudentEntries((demoDummyData as any).student?.fullTimetable || []);
          } else {
            console.warn('[useDaySchedule] Failed to load student timetable:', err);
            setStudentEntries([]);
          }
        }
      }

      // 2. PARENT ROLE
      if (isParentRole) {
        try {
          const rawStudents = await ParentService.getLinkedStudents();
          const childrenList: any[] = Array.isArray(rawStudents) ? rawStudents : [];

          if (childrenList.length > 0) {
            const groups: ParentChildGroup[] = await Promise.all(
              childrenList.map(async (item: any) => {
                const rawStudent = item.student || item;
                const rawUser = rawStudent.users || rawStudent.user || {};
                const childId = rawStudent.id || item.id || item.student_id;
                const childName =
                  rawUser.full_name ||
                  `${rawUser.first_name || ''} ${rawUser.last_name || ''}`.trim() ||
                  item.student_name ||
                  'Student';
                const classId = item.class_id || rawStudent.class_id;
                const className = item.class_name || rawStudent.class_name || 'Class';

                let entries: TimetableEntry[] = [];
                if (classId) {
                  try {
                    entries = (await TimetableAPI.getClassTimetable(classId)) || [];
                  } catch {
                    entries = [];
                  }
                }

                return {
                  childId,
                  childName,
                  className,
                  entries,
                };
              })
            );

            setParentChildrenGroups(groups);
          } else if (isDemo) {
            const demoChildren = (demoDummyData as any).parent?.children || [];
            const demoGroup: ParentChildGroup[] = demoChildren.map((c: any) => ({
              childId: c.id,
              childName: c.name,
              className: c.class || 'Form 2 East',
              entries: (demoDummyData as any).student?.fullTimetable || [],
            }));
            setParentChildrenGroups(demoGroup);
          } else {
            setParentChildrenGroups([]);
          }
        } catch (err: any) {
          if (isDemo) {
            const demoChildren = (demoDummyData as any).parent?.children || [];
            setParentChildrenGroups(
              demoChildren.map((c: any) => ({
                childId: c.id,
                childName: c.name,
                className: c.class || 'Form 2 East',
                entries: (demoDummyData as any).student?.fullTimetable || [],
              }))
            );
          } else {
            console.warn('[useDaySchedule] Failed to load parent linked children:', err);
            setParentChildrenGroups([]);
          }
        }
      }

      // 3. TEACHER ROLE
      if (isTeacherRole) {
        // Fetch teacher's own teaching schedule
        let teacherData: TimetableEntry[] = [];
        try {
          teacherData = await TimetableAPI.getTeacherTimetable();
          if ((!teacherData || teacherData.length === 0) && isDemo) {
            teacherData = (demoDummyData as any).teacher?.fullTimetable || [];
          }
        } catch {
          if (isDemo) {
            teacherData = (demoDummyData as any).teacher?.fullTimetable || [];
          }
        }
        setTeacherEntries(teacherData || []);

        // Also fetch Class Teacher assigned class timetable if in class mode or has class assignment
        try {
          const stats = await TeacherAPI.getDashboardStats().catch(() => null);
          const ctList = stats?.classTeacherOf || [];
          if (Array.isArray(ctList) && ctList.length > 0) {
            const assignedClass = ctList[0];
            const assignedClassId = assignedClass.id;
            const assignedLabel =
              assignedClass.display_name ||
              assignedClass.name ||
              (assignedClass.grade_level ? `Grade ${assignedClass.grade_level}${assignedClass.stream || ''}` : 'Assigned Class');

            setClassTeacherLabel(assignedLabel);

            if (assignedClassId) {
              const ctTimetable = await TimetableAPI.getClassTimetable(assignedClassId).catch(() => []);
              setClassTeacherEntries(ctTimetable || []);
            }
          } else if (isDemo) {
            setClassTeacherLabel('Grade 12A');
            setClassTeacherEntries((demoDummyData as any).student?.fullTimetable || []);
          }
        } catch {
          if (isDemo) {
            setClassTeacherLabel('Grade 12A');
            setClassTeacherEntries((demoDummyData as any).student?.fullTimetable || []);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load daily schedule.');
    } finally {
      setLoading(false);
    }
  }, [effectiveRole, isDemo]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  return {
    loading,
    error,
    studentEntries,
    teacherEntries,
    classTeacherEntries,
    classTeacherLabel,
    parentChildrenGroups,
    refetch: fetchSchedule,
  };
}
