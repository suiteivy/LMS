import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Calendar,
  Clock,
  Edit2,
  GraduationCap,
  MapPin,
  Plus,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherRoleMode } from '@/hooks/useTeacherRoleMode';
import { useDaySchedule } from '@/hooks/useDaySchedule';
import {
  CalendarEvent,
  CancelledDateInfo,
} from '@/services/CalendarService';
import { darkColors, lightColors } from '@/constants/appTheme';
import {
  filterAndSortTimetable,
  getDayCancellationInfo,
} from '@/utils/calendarDayDetailUtils';

export interface DayDetailViewProps {
  selectedDateStr: string;
  selectedDateLabel: string;
  events: CalendarEvent[];
  cancelledDates: CancelledDateInfo[];
  loadingEvents: boolean;
  userRole?: string;
  isAdmin?: boolean;
  isReadOnlyAdmin?: boolean;
  onOpenCreateModal?: () => void;
  onOpenEditModal?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  onOpenDecisionModal?: (event: CalendarEvent) => void;
  onClose?: () => void;
  isMobileSheet?: boolean;
}

const EVENT_TYPE_STYLES: Record<string, { color: string; label: string }> = {
  event: { color: '#FF6B00', label: 'Event' },
  exam: { color: '#EF4444', label: 'Exam' },
  holiday: { color: '#10B981', label: 'Holiday' },
  meeting: { color: '#3B82F6', label: 'Meeting' },
  class: { color: '#8B5CF6', label: 'Class' },
};

export function DayDetailView({
  selectedDateStr,
  selectedDateLabel,
  events,
  cancelledDates,
  loadingEvents,
  userRole,
  isAdmin = false,
  isReadOnlyAdmin = false,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteEvent,
  onOpenDecisionModal,
  onClose,
  isMobileSheet = false,
}: DayDetailViewProps) {
  const { isDark } = useTheme();
  const colors = isDark ? darkColors : lightColors;
  const { profile, activeRole } = useAuth();
  const { mode: teacherMode } = useTeacherRoleMode();

  const effectiveRole = (
    activeRole ||
    userRole ||
    profile?.role ||
    'student'
  ).toLowerCase();

  const isStudent = effectiveRole === 'student';
  const isParent = effectiveRole === 'parent';
  const isTeacher = effectiveRole === 'teacher';

  const {
    loading: loadingSchedule,
    studentEntries,
    teacherEntries,
    classTeacherEntries,
    classTeacherLabel,
    parentChildrenGroups,
  } = useDaySchedule(userRole);

  const selectedDate = useMemo(() => {
    return new Date(`${selectedDateStr}T00:00:00`);
  }, [selectedDateStr]);

  // Cancellation detection
  const cancellationInfo = useMemo(() => {
    return getDayCancellationInfo(selectedDateStr, events, cancelledDates);
  }, [selectedDateStr, events, cancelledDates]);

  // Timetable entries filtered for selected day of week
  const filteredStudentClasses = useMemo(() => {
    if (!isStudent) return [];
    return filterAndSortTimetable(studentEntries, selectedDate);
  }, [isStudent, studentEntries, selectedDate]);

  const filteredTeacherClasses = useMemo(() => {
    if (!isTeacher) return [];
    if (teacherMode === 'class') {
      return filterAndSortTimetable(classTeacherEntries, selectedDate);
    }
    return filterAndSortTimetable(teacherEntries, selectedDate);
  }, [isTeacher, teacherMode, teacherEntries, classTeacherEntries, selectedDate]);

  const parentChildrenDaySchedule = useMemo(() => {
    if (!isParent) return [];
    return parentChildrenGroups.map((group) => ({
      ...group,
      dayClasses: filterAndSortTimetable(group.entries, selectedDate),
    }));
  }, [isParent, parentChildrenGroups, selectedDate]);

  const hasClassesScheduled = useMemo(() => {
    if (cancellationInfo.isCancelled) return false;
    if (isStudent) return filteredStudentClasses.length > 0;
    if (isTeacher) return filteredTeacherClasses.length > 0;
    if (isParent) return parentChildrenDaySchedule.some((g) => g.dayClasses.length > 0);
    return false;
  }, [
    cancellationInfo.isCancelled,
    isStudent,
    isTeacher,
    isParent,
    filteredStudentClasses,
    filteredTeacherClasses,
    parentChildrenDaySchedule,
  ]);

  const isLoading = loadingEvents || (loadingSchedule && (isStudent || isParent || isTeacher));
  const isCompletelyEmpty = !isLoading && events.length === 0 && !hasClassesScheduled && !cancellationInfo.isCancelled;

  const roleBadgeLabel = useMemo(() => {
    if (isStudent) return 'Student Schedule';
    if (isParent) return 'Parent Overview';
    if (isTeacher) {
      if (teacherMode === 'class') return `Class Schedule (${classTeacherLabel})`;
      if (teacherMode === 'subject') return 'Teaching Schedule';
      if (teacherMode === 'hod') return 'HOD Schedule';
      return 'Teacher Schedule';
    }
    if (isAdmin) return 'Admin Calendar';
    return 'School Calendar';
  }, [isStudent, isParent, isTeacher, teacherMode, classTeacherLabel, isAdmin]);

  return (
    <View style={[styles.container, { backgroundColor: isMobileSheet ? 'transparent' : colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={[styles.dateTitle, { color: colors.text }]}>{selectedDateLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <View style={[styles.roleBadge, { backgroundColor: `${colors.accent}15`, borderColor: `${colors.accent}40` }]}>
              <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{roleBadgeLabel}</Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSub }]}>
              {events.length} event{events.length !== 1 ? 's' : ''}
              {(isStudent || isTeacher || isParent) && !cancellationInfo.isCancelled
                ? ` • ${
                    isParent
                      ? `${parentChildrenDaySchedule.reduce((sum, g) => sum + g.dayClasses.length, 0)} total classes`
                      : `${isStudent ? filteredStudentClasses.length : filteredTeacherClasses.length} class${(isStudent ? filteredStudentClasses.length : filteredTeacherClasses.length) !== 1 ? 'es' : ''}`
                  }`
                : ''}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {isAdmin && onOpenCreateModal ? (
            <TouchableOpacity onPress={onOpenCreateModal} style={styles.addBtn} accessibilityLabel="Add calendar event">
              <Plus size={13} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          ) : null}

          {isMobileSheet && onClose ? (
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? '#21262D' : '#F3F4F6' }]} accessibilityLabel="Close day details">
              <X size={16} color={colors.textSub} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Body Content */}
      <View style={{ marginTop: 14, gap: 12 }}>
        {/* Loading Skeleton */}
        {isLoading ? (
          <View style={{ gap: 10, paddingVertical: 8 }}>
            <View style={[styles.skeletonCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <View style={[styles.skeletonLine, { width: '45%', height: 14, backgroundColor: isDark ? '#30363D' : '#E5E7EB' }]} />
              <View style={[styles.skeletonLine, { width: '70%', height: 11, marginTop: 8, backgroundColor: isDark ? '#21262D' : '#F3F4F6' }]} />
            </View>
            <View style={[styles.skeletonCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <View style={[styles.skeletonLine, { width: '60%', height: 14, backgroundColor: isDark ? '#30363D' : '#E5E7EB' }]} />
              <View style={[styles.skeletonLine, { width: '40%', height: 11, marginTop: 8, backgroundColor: isDark ? '#21262D' : '#F3F4F6' }]} />
            </View>
            <View style={[styles.skeletonCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <View style={[styles.skeletonLine, { width: '50%', height: 14, backgroundColor: isDark ? '#30363D' : '#E5E7EB' }]} />
              <View style={[styles.skeletonLine, { width: '80%', height: 11, marginTop: 8, backgroundColor: isDark ? '#21262D' : '#F3F4F6' }]} />
            </View>
          </View>
        ) : isCompletelyEmpty ? (
          /* Plain Language Empty State */
          <View style={[styles.emptyContainer, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.accent}15` }]}>
              <Calendar size={22} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing scheduled for this day</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSub }]}>
              No events, holidays, or academic sessions scheduled for this date.
            </Text>
          </View>
        ) : (
          <>
            {/* 1. EVENTS SECTION (Listed First) */}
            {events.length > 0 && (
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Text style={[styles.sectionHeading, { color: colors.textSub }]}>CALENDAR EVENTS</Text>
                  <Text style={[styles.sectionCountBadge, { color: colors.textSub }]}>{events.length}</Text>
                </View>

                {events.map((event) => {
                  const typeChip = EVENT_TYPE_STYLES[String(event.event_type || 'event').toLowerCase()] || EVENT_TYPE_STYLES.event;
                  const isMultiDay = Boolean(event.start_date && event.end_date && event.start_date !== event.end_date);

                  return (
                    <View
                      key={event.id}
                      style={[
                        styles.eventCard,
                        {
                          borderColor: event.cancel_classes ? colors.redBorder : colors.border,
                          backgroundColor: event.cancel_classes ? colors.redDim : colors.surface2,
                        },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>

                          {/* Chips row */}
                          <View style={styles.chipsRow}>
                            {event.is_national_holiday ? (
                              <>
                                <View style={styles.holidayBadge}>
                                  <Text style={styles.holidayBadgeText}>🏛️ National Holiday</Text>
                                </View>
                                {event.is_provisional && (
                                  <View style={styles.provisionalBadge}>
                                    <Text style={styles.provisionalBadgeText}>Provisional</Text>
                                  </View>
                                )}
                                {event.is_pending_decision ? (
                                  <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingBadgeText}>⚠️ Pending Decision (Classes Run)</Text>
                                  </View>
                                ) : event.cancel_classes ? (
                                  <View style={[styles.decisionBadge, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
                                    <Text style={[styles.decisionBadgeText, { color: colors.red }]}>Classes Cancelled</Text>
                                  </View>
                                ) : (
                                  <View style={[styles.decisionBadge, { backgroundColor: '#DCFCE7', borderColor: '#22C55E' }]}>
                                    <Text style={[styles.decisionBadgeText, { color: '#15803D' }]}>Classes Run Normally</Text>
                                  </View>
                                )}
                              </>
                            ) : (
                              <View style={[styles.eventTypeBadge, { backgroundColor: `${typeChip.color}18`, borderColor: `${typeChip.color}55` }]}>
                                <Text style={[styles.eventTypeText, { color: typeChip.color }]}>{typeChip.label}</Text>
                              </View>
                            )}

                            {isMultiDay && (
                              <View style={[styles.multiDayBadge, { backgroundColor: isDark ? '#21262D' : '#E5E7EB' }]}>
                                <Text style={[styles.multiDayText, { color: colors.textSub }]}>
                                  Multi-Day ({event.start_date} to {event.end_date})
                                </Text>
                              </View>
                            )}

                            {(event.start_time || event.end_time) && (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Clock size={11} color={colors.textSub} style={{ marginRight: 4 }} />
                                <Text style={[styles.timeText, { color: colors.textSub }]}>
                                  {event.start_time || ''}{event.end_time ? ` - ${event.end_time}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          event.is_national_holiday && onOpenDecisionModal ? (
                            <TouchableOpacity
                              onPress={() => onOpenDecisionModal(event)}
                              style={[
                                styles.decisionActionBtn,
                                { backgroundColor: event.is_pending_decision ? '#F59E0B' : '#3B82F6' },
                              ]}
                            >
                              <Text style={styles.decisionActionBtnText}>
                                {event.is_pending_decision ? 'Set Decision' : 'Change Decision'}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              {onOpenEditModal && (
                                <TouchableOpacity
                                  onPress={() => (isReadOnlyAdmin ? null : onOpenEditModal(event))}
                                  style={[styles.smallIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                  accessibilityLabel="Edit event"
                                >
                                  <Edit2 size={12} color={colors.textSub} />
                                </TouchableOpacity>
                              )}
                              {onDeleteEvent && (
                                <TouchableOpacity
                                  onPress={() => (isReadOnlyAdmin ? null : onDeleteEvent(event))}
                                  style={[styles.smallIconBtn, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}
                                  accessibilityLabel="Delete event"
                                >
                                  <Trash2 size={12} color={colors.red} />
                                </TouchableOpacity>
                              )}
                            </View>
                          )
                        )}
                      </View>

                      {event.description ? (
                        <Text style={[styles.eventDescription, { color: colors.textSub }]}>
                          {event.description}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* 2. CANCELLATION NOTICE (Decision Point 1: Replaces Class List) */}
            {cancellationInfo.isCancelled ? (
              <View style={[styles.cancellationBanner, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#FCA5A5' }]}>
                <View style={[styles.cancellationIconBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2' }]}>
                  <AlertTriangle size={20} color="#EF4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cancellationTitle}>No Classes Today</Text>
                  <Text style={[styles.cancellationReason, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
                    Academic sessions are suspended due to: <Text style={{ fontWeight: '800' }}>{cancellationInfo.reason}</Text>.
                  </Text>
                  <Text style={[styles.cancellationFootnote, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
                    Regular timetable will resume on the next scheduled school day.
                  </Text>
                </View>
              </View>
            ) : (
              /* 3. TIMETABLE CLASSES SECTION (Role Scoped) */
              <>
                {/* STUDENT VIEW */}
                {isStudent && (
                  <View style={{ gap: 8, marginTop: events.length > 0 ? 6 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.sectionHeading, { color: colors.textSub }]}>CLASS TIMETABLE</Text>
                      <Text style={[styles.sectionCountBadge, { color: colors.textSub }]}>
                        {filteredStudentClasses.length} {filteredStudentClasses.length === 1 ? 'class' : 'classes'}
                      </Text>
                    </View>

                    {filteredStudentClasses.length === 0 ? (
                      <View style={[styles.noClassesCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                        <Text style={[styles.noClassesText, { color: colors.textSub }]}>No classes scheduled for today.</Text>
                      </View>
                    ) : (
                      filteredStudentClasses.map((item) => (
                        <ClassItemRow key={item.id} entry={item} colors={colors} isDark={isDark} showTeacher />
                      ))
                    )}
                  </View>
                )}

                {/* TEACHER VIEW */}
                {isTeacher && (
                  <View style={{ gap: 8, marginTop: events.length > 0 ? 6 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.sectionHeading, { color: colors.textSub }]}>
                        {teacherMode === 'class' ? `CLASS TIMETABLE (${classTeacherLabel})` : 'TEACHING TIMETABLE'}
                      </Text>
                      <Text style={[styles.sectionCountBadge, { color: colors.textSub }]}>
                        {filteredTeacherClasses.length} {filteredTeacherClasses.length === 1 ? 'period' : 'periods'}
                      </Text>
                    </View>

                    {filteredTeacherClasses.length === 0 ? (
                      <View style={[styles.noClassesCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                        <Text style={[styles.noClassesText, { color: colors.textSub }]}>
                          {teacherMode === 'class'
                            ? `No classes scheduled for ${classTeacherLabel} today.`
                            : 'No teaching periods scheduled for today.'}
                        </Text>
                      </View>
                    ) : (
                      filteredTeacherClasses.map((item) => (
                        <ClassItemRow
                          key={item.id}
                          entry={item}
                          colors={colors}
                          isDark={isDark}
                          showClass={teacherMode !== 'class'}
                          showTeacher={teacherMode === 'class'}
                        />
                      ))
                    )}
                  </View>
                )}

                {/* PARENT VIEW (Decision Point 2: Grouped by Child) */}
                {isParent && (
                  <View style={{ gap: 12, marginTop: events.length > 0 ? 6 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.sectionHeading, { color: colors.textSub }]}>CHILDREN SCHEDULES</Text>
                      <Text style={[styles.sectionCountBadge, { color: colors.textSub }]}>
                        {parentChildrenDaySchedule.length} {parentChildrenDaySchedule.length === 1 ? 'child' : 'children'}
                      </Text>
                    </View>

                    {parentChildrenDaySchedule.length === 0 ? (
                      <View style={[styles.noClassesCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
                        <Text style={[styles.noClassesText, { color: colors.textSub }]}>No linked student accounts found.</Text>
                      </View>
                    ) : (
                      parentChildrenDaySchedule.map((childGroup) => (
                        <View
                          key={childGroup.childId}
                          style={[styles.childGroupCard, { backgroundColor: colors.surface2, borderColor: colors.border }]}
                        >
                          {/* Child Sub-Heading */}
                          <View style={styles.childHeaderRow}>
                            <View style={[styles.childAvatarCircle, { backgroundColor: `${colors.accent}20` }]}>
                              <GraduationCap size={15} color={colors.accent} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.childName, { color: colors.text }]}>{childGroup.childName}</Text>
                              <Text style={[styles.childClassLabel, { color: colors.textSub }]}>{childGroup.className}</Text>
                            </View>
                            <View style={[styles.childCountPill, { backgroundColor: isDark ? '#21262D' : '#E5E7EB' }]}>
                              <Text style={[styles.childCountText, { color: colors.textSub }]}>
                                {childGroup.dayClasses.length} {childGroup.dayClasses.length === 1 ? 'class' : 'classes'}
                              </Text>
                            </View>
                          </View>

                          {/* Child classes */}
                          <View style={{ marginTop: 10, gap: 8 }}>
                            {childGroup.dayClasses.length === 0 ? (
                              <View style={[styles.childEmptyRow, { borderColor: isDark ? '#30363D' : '#E1E4E8' }]}>
                                <Text style={[styles.childEmptyText, { color: colors.textSub }]}>
                                  No classes scheduled for {childGroup.childName} today.
                                </Text>
                              </View>
                            ) : (
                              childGroup.dayClasses.map((item) => (
                                <ClassItemRow key={item.id} entry={item} colors={colors} isDark={isDark} showTeacher />
                              ))
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function ClassItemRow({
  entry,
  colors,
  isDark,
  showTeacher = false,
  showClass = false,
}: {
  entry: any;
  colors: any;
  isDark: boolean;
  showTeacher?: boolean;
  showClass?: boolean;
}) {
  const subjectTitle = entry.subjects?.title || entry.subject_name || entry.subject?.title || 'Academic Unit';
  const category = entry.subjects?.category;
  const room = entry.room_number;
  const startTime = (entry.start_time || '').slice(0, 5);
  const endTime = (entry.end_time || '').slice(0, 5);

  const teacherName =
    entry.teachers?.full_name ||
    entry.subjects?.teachers?.users?.full_name ||
    entry.teacher_name ||
    'Assigned Faculty';

  const className =
    entry.classes?.display_name ||
    entry.classes?.name ||
    entry.class_name ||
    'Class';

  return (
    <View style={styles.classRow}>
      {/* Time column */}
      <View style={styles.classTimeCol}>
        <Text style={[styles.classTimeText, { color: colors.text }]}>{startTime || '--:--'}</Text>
        <Text style={[styles.classTimeEndText, { color: colors.textSub }]}>{endTime || ''}</Text>
        <View style={[styles.classTimelineDivider, { backgroundColor: isDark ? '#30363D' : '#E1E4E8' }]} />
      </View>

      {/* Class Details Card */}
      <View style={[styles.classCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[styles.classSubjectTitle, { color: colors.text }]} numberOfLines={1}>
                {subjectTitle}
              </Text>
              {category && (
                <View style={[styles.categoryBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF', borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE' }]}>
                  <Text style={styles.categoryBadgeText}>{category}</Text>
                </View>
              )}
            </View>
          </View>

          {room ? (
            <View style={[styles.roomBadge, { backgroundColor: colors.surface2, borderColor: colors.border }]}>
              <MapPin size={10} color={colors.textSub} style={{ marginRight: 3 }} />
              <Text style={[styles.roomBadgeText, { color: colors.textSub }]}>{room}</Text>
            </View>
          ) : null}
        </View>

        {/* Bottom meta row */}
        <View style={styles.classMetaRow}>
          {showTeacher && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <User size={12} color={colors.accent} style={{ marginRight: 5 }} />
              <Text style={[styles.classMetaText, { color: colors.text }]} numberOfLines={1}>
                {teacherName}
              </Text>
            </View>
          )}

          {showClass && (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Users size={12} color="#3B82F6" style={{ marginRight: 5 }} />
              <Text style={[styles.classMetaText, { color: colors.text }]} numberOfLines={1}>
                {className}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionCountBadge: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  eventCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  holidayBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  holidayBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  provisionalBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  provisionalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  pendingBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  decisionBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderWidth: 1,
  },
  decisionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  eventTypeBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderWidth: 1,
  },
  eventTypeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  multiDayBadge: {
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  multiDayText: {
    fontSize: 9,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  decisionActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  decisionActionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  smallIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDescription: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
  },
  cancellationBanner: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cancellationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancellationTitle: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '900',
  },
  cancellationReason: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  cancellationFootnote: {
    fontSize: 10,
    marginTop: 4,
  },
  noClassesCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  noClassesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  childGroupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  childHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  childAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 13,
    fontWeight: '800',
  },
  childClassLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  childCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  childCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  childEmptyRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 10,
    alignItems: 'center',
  },
  childEmptyText: {
    fontSize: 11,
    fontWeight: '500',
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  classTimeCol: {
    width: 48,
    alignItems: 'center',
    paddingTop: 3,
  },
  classTimeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  classTimeEndText: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  classTimelineDivider: {
    width: 1.5,
    flex: 1,
    borderRadius: 1,
    marginTop: 4,
  },
  classCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
  },
  classSubjectTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  categoryBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  categoryBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#3B82F6',
    textTransform: 'uppercase',
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roomBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  classMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  skeletonCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  skeletonLine: {
    borderRadius: 4,
  },
});
