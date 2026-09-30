import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Edit2,
  Globe,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import { ActionTooltip } from '@/components/common/ActionTooltip';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  CalendarAPI,
  CalendarEvent,
  CreateCalendarEventDto,
} from '@/services/CalendarService';
import { darkColors, lightColors } from '@/constants/appTheme';
import { showError, showSuccess } from '@/utils/toast';

type ValidCalendarRole = 'Admin' | 'Teacher' | 'Student' | 'Parent/Guardian' | 'Master Admin';

interface SchoolCalendarViewProps {
  roleTitle?: ValidCalendarRole;
  userRole?: string;
  onBack?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_COLUMN_WIDTH = '14.2857%' as const;

const EVENT_TYPE_STYLES: Record<string, { color: string; label: string }> = {
  event: { color: '#FF6B00', label: 'Event' },
  exam: { color: '#EF4444', label: 'Exam' },
  holiday: { color: '#10B981', label: 'Holiday' },
  meeting: { color: '#3B82F6', label: 'Meeting' },
  class: { color: '#8B5CF6', label: 'Class' },
};

const getLocalDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getEventTypeStyle = (event: CalendarEvent) => {
  if (event.cancel_classes) return { color: '#EF4444', label: 'No Classes' };
  return EVENT_TYPE_STYLES[String(event.event_type || 'event').toLowerCase()] || EVENT_TYPE_STYLES.event;
};

function LegendPill({ label, color, bg, textColor }: { label: string; color: string; bg: string; textColor: string }) {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 99,
      borderWidth: 1,
      borderColor: `${color}66`,
      backgroundColor: bg,
      paddingHorizontal: 10,
      paddingVertical: 5,
    }}>
      <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: color, marginRight: 6 }} />
      <Text style={{ color: textColor, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function SchoolCalendarView({ roleTitle, userRole, onBack }: SchoolCalendarViewProps) {
  const { isDark } = useTheme();
  const { profile, isReadOnlyAdmin } = useAuth();
  const { width } = useWindowDimensions();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'master_admin' || userRole === 'admin';
  const colors = isDark ? darkColors : lightColors;
  const screenBackgroundColor = isDark ? '#161B22' : colors.bg;
  const isDesktop = width >= 1100;
  const isTablet = width >= 760;

  const resolvedRoleTitle: ValidCalendarRole = roleTitle || (
    userRole === 'admin' ? 'Admin' :
    userRole === 'teacher' ? 'Teacher' :
    userRole === 'parent' ? 'Parent/Guardian' :
    isAdmin ? 'Admin' : 'Student'
  );

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return getLocalDateOnly(new Date());
  });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // National Holiday State & Decisions
  const [syncingHolidays, setSyncingHolidays] = useState(false);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedHolidayEvent, setSelectedHolidayEvent] = useState<CalendarEvent | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<'cancel_classes' | 'run_classes' | 'pending'>('cancel_classes');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formEventType, setFormEventType] = useState('event');
  const [formCancelClasses, setFormCancelClasses] = useState<boolean | null>(null);
  const [formTargetAudience, setFormTargetAudience] = useState<'all' | 'parents' | 'teachers' | 'students'>('all');
  const [formExpiryDays, setFormExpiryDays] = useState('7');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const todayStr = getLocalDateOnly(new Date());

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CalendarAPI.getEvents({
        year: currentYear,
        month: currentMonth + 1,
      });
      setEvents(data);
    } catch (err: any) {
      showError('Error', err?.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Calendar Grid calculation (Monday-first, fixed 6 rows = 42 cells)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // 0 = Sunday, convert to Monday = 0
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex < 0) startDayIndex = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const pad = String(m).padStart(2, '0');
      const padD = String(d).padStart(2, '0');
      days.push({ dateStr: `${y}-${pad}-${padD}`, dayNumber: d, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const padM = String(currentMonth + 1).padStart(2, '0');
      const padD = String(d).padStart(2, '0');
      days.push({ dateStr: `${currentYear}-${padM}-${padD}`, dayNumber: d, isCurrentMonth: true });
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
        const m = currentMonth + 2 > 12 ? 1 : currentMonth + 2;
        const y = currentMonth + 2 > 12 ? currentYear + 1 : currentYear;
        const pad = String(m).padStart(2, '0');
        const padD = String(d).padStart(2, '0');
        days.push({ dateStr: `${y}-${pad}-${padD}`, dayNumber: d, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const list = map.get(ev.event_date) || [];
      list.push(ev);
      map.set(ev.event_date, list);
    });
    return map;
  }, [events]);

  const selectedEvents = useMemo(() => {
    return eventsByDate.get(selectedDateStr) || [];
  }, [eventsByDate, selectedDateStr]);

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => event.event_date >= todayStr)
      .sort((a, b) => {
        const left = `${a.event_date}T${a.start_time || '00:00:00'}`;
        const right = `${b.event_date}T${b.start_time || '00:00:00'}`;
        return left.localeCompare(right);
      })
      .slice(0, 5);
  }, [events, todayStr]);

  const selectedDateLabel = useMemo(() => {
    const safeDate = new Date(`${selectedDateStr}T00:00:00`);
    if (Number.isNaN(safeDate.getTime())) return selectedDateStr;
    return safeDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDateStr]);

  const pendingHolidays = useMemo(() => {
    return events.filter((e) => e.is_national_holiday && e.is_pending_decision);
  }, [events]);

  const showReadOnlyNotice = () => {
    showError('Read-Only Access', 'Read-only access — contact the main administrator to make changes.');
  };

  const handleSyncHolidays = async () => {
    if (isReadOnlyAdmin) {
      showReadOnlyNotice();
      return;
    }
    try {
      setSyncingHolidays(true);
      const res = await CalendarAPI.syncNationalHolidays();
      showSuccess('Holidays Synced', `National holidays updated for ${res.country_name || res.country_code}.`);
      await fetchEvents();
    } catch (err: any) {
      showError('Sync Failed', err?.message || 'Failed to sync national holidays');
    } finally {
      setSyncingHolidays(false);
    }
  };

  const handleOpenDecisionModal = (event: CalendarEvent) => {
    if (isReadOnlyAdmin) {
      showReadOnlyNotice();
      return;
    }
    setSelectedHolidayEvent(event);
    setSelectedDecision(event.decision || (event.cancel_classes ? 'cancel_classes' : 'run_classes'));
    setDecisionNotes(event.description || '');
    setDecisionModalVisible(true);
  };

  const handleSaveDecision = async () => {
    if (!selectedHolidayEvent?.national_holiday_id) return;
    try {
      setSavingDecision(true);
      await CalendarAPI.setHolidayDecision(
        selectedHolidayEvent.national_holiday_id,
        selectedDecision,
        decisionNotes
      );
      showSuccess(
        'Decision Saved',
        selectedDecision === 'cancel_classes'
          ? 'Classes cancelled for this national holiday.'
          : selectedDecision === 'run_classes'
          ? 'Classes will run as normal (observance only).'
          : 'Holiday marked as pending decision.'
      );
      setDecisionModalVisible(false);
      setSelectedHolidayEvent(null);
      await fetchEvents();
    } catch (err: any) {
      showError('Failed to save decision', err?.message || 'Failed to update holiday decision');
    } finally {
      setSavingDecision(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handlePrevYear = () => {
    setCurrentDate(new Date(currentYear - 1, currentMonth, 1));
  };

  const handleNextYear = () => {
    setCurrentDate(new Date(currentYear + 1, currentMonth, 1));
  };

  const handleOpenCreateModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(dateStr || selectedDateStr);
    setFormStartTime('08:00');
    setFormEndTime('10:00');
    setFormEventType('event');
    setFormCancelClasses(null);
    setFormTargetAudience('all');
    setFormExpiryDays('7');
    setModalVisible(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    setFormDate(event.event_date);
    setFormStartTime(event.start_time || '');
    setFormEndTime(event.end_time || '');
    setFormEventType(event.event_type || 'event');
    setFormCancelClasses(typeof event.cancel_classes === 'boolean' ? event.cancel_classes : false);
    setFormTargetAudience((event.metadata?.target_audience as any) || 'all');
    setFormExpiryDays('7');
    setModalVisible(true);
  };

  const handleSaveEvent = async () => {
    if (!formTitle.trim()) {
      showError('Required', 'Please enter an event title');
      return;
    }
    if (!formDate.trim()) {
      showError('Required', 'Please select an event date');
      return;
    }
    if (formCancelClasses === null) {
      showError('Decision Required', 'Please explicitly select whether classes continue or are cancelled.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateCalendarEventDto = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        event_date: formDate,
        start_time: formStartTime.trim() || undefined,
        end_time: formEndTime.trim() || undefined,
        event_type: formEventType,
        cancel_classes: formCancelClasses,
        target_audience: formTargetAudience,
        announcement_expiry_days: Number(formExpiryDays) || 7,
      };

      if (editingEvent) {
        await CalendarAPI.updateEvent(editingEvent.id, payload);
        showSuccess('Updated', 'Event and linked announcement updated successfully');
      } else {
        await CalendarAPI.createEvent(payload);
        showSuccess('Created', 'Event created and announcement posted');
      }

      setModalVisible(false);
      fetchEvents();
    } catch (err: any) {
      showError('Save Failed', err?.message || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = (event: CalendarEvent) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? Any linked announcement will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CalendarAPI.deleteEvent(event.id);
              showSuccess('Deleted', 'Event removed from calendar');
              fetchEvents();
            } catch (err: any) {
              showError('Error', err?.message || 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: screenBackgroundColor }}>
      <UnifiedHeader
        title="School Calendar"
        subtitle="Events & Schedules"
        role={resolvedRoleTitle}
        onBack={onBack}
        rightActions={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isAdmin && (
              <>
                <ActionTooltip
                  label="Sync National Holidays"
                  description="Synchronize official public and gazetted holidays for your institution's country."
                  learnMoreAnchor="school-calendar"
                >
                  <TouchableOpacity
                    onPress={handleSyncHolidays}
                    disabled={syncingHolidays}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: colors.border,
                      paddingHorizontal: isTablet ? 12 : 9,
                      height: 36,
                      borderRadius: 999,
                      gap: 4,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Sync National Holidays"
                  >
                    {syncingHolidays ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <Globe size={14} color={colors.text} />
                    )}
                    {isTablet && (
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>
                        {syncingHolidays ? 'Syncing...' : 'Sync Holidays'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </ActionTooltip>

                <ActionTooltip
                  label="Add Calendar Event"
                  description="Schedule an institution event, examination window, holiday, or class cancellation."
                  learnMoreAnchor="school-calendar"
                >
                  <TouchableOpacity
                    onPress={isReadOnlyAdmin ? showReadOnlyNotice : () => handleOpenCreateModal()}
                    style={[
                      styles.addButton,
                      !isTablet && {
                        paddingHorizontal: 0,
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Create Calendar Event"
                  >
                    <Plus size={16} color="#ffffff" style={isTablet ? { marginRight: 4 } : undefined} />
                    {isTablet && <Text className="text-white font-bold text-xs">Add Event</Text>}
                  </TouchableOpacity>
                </ActionTooltip>
              </>
            )}
            <ActionTooltip
              label="Refresh Calendar"
              description="Reload published institutional dates, term events, and class closures."
              learnMoreAnchor="school-calendar"
            >
              <TouchableOpacity
                onPress={fetchEvents}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.surface,
                }}
                accessibilityRole="button"
                accessibilityLabel="Refresh Events"
              >
                <RefreshCw size={15} color={colors.textSub} />
              </TouchableOpacity>
            </ActionTooltip>
          </View>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: isTablet ? 32 : 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 14 }}>
          {/* Pending National Holidays Warning Banner */}
          {pendingHolidays.length > 0 && (
            <View style={{
              backgroundColor: isDark ? '#78350f30' : '#fef3c7',
              borderColor: '#f59e0b',
              borderWidth: 1,
              borderRadius: 18,
              padding: 14,
              flexDirection: isTablet ? 'row' : 'column',
              alignItems: isTablet ? 'center' : 'stretch',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: isTablet ? 1 : undefined }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="#b45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: isDark ? '#fbbf24' : '#92400e' }}>
                    {pendingHolidays.length} National Holiday{pendingHolidays.length !== 1 ? 's' : ''} Awaiting Decision
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? '#d1d5db' : '#78350f', marginTop: 2, lineHeight: 16 }}>
                    Classes continue as normal until administration explicitly decides to cancel classes.
                  </Text>
                </View>
              </View>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    const first = pendingHolidays[0];
                    if (first) {
                      setSelectedDateStr(first.event_date);
                      handleOpenDecisionModal(first);
                    }
                  }}
                  style={{
                    backgroundColor: '#f59e0b',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>Review Decisions</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <GlassCard
            variant="modal"
            borderRadius={22}
            accentColor={colors.accent}
            glowColor={isDark ? 'rgba(255,107,0,0.25)' : 'rgba(255,107,0,0.18)'}
            contentStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActionTooltip label="Previous Year" description="Jump backward by one full year." learnMoreAnchor="school-calendar">
                  <TouchableOpacity onPress={handlePrevYear} style={[styles.monthNavBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} accessibilityLabel="Previous year">
                    <ChevronsLeft size={18} color={colors.text} />
                  </TouchableOpacity>
                </ActionTooltip>

                <ActionTooltip label="Previous Month" description="Navigate to preceding month's calendar view." learnMoreAnchor="school-calendar">
                  <TouchableOpacity onPress={handlePrevMonth} style={[styles.monthNavBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} accessibilityLabel="Previous month">
                    <ChevronLeft size={18} color={colors.text} />
                  </TouchableOpacity>
                </ActionTooltip>
              </View>

              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: isTablet ? 22 : 18 }}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
                <Text style={{ color: colors.textSub, fontWeight: '700', fontSize: 12 }}>
                  {events.length} total event{events.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActionTooltip label="Next Month" description="Navigate to subsequent month's calendar view." learnMoreAnchor="school-calendar">
                  <TouchableOpacity onPress={handleNextMonth} style={[styles.monthNavBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} accessibilityLabel="Next month">
                    <ChevronRight size={18} color={colors.text} />
                  </TouchableOpacity>
                </ActionTooltip>

                <ActionTooltip label="Next Year" description="Jump forward by one full year." learnMoreAnchor="school-calendar">
                  <TouchableOpacity onPress={handleNextYear} style={[styles.monthNavBtn, { borderColor: colors.border, backgroundColor: colors.surface2 }]} accessibilityLabel="Next year">
                    <ChevronsRight size={18} color={colors.text} />
                  </TouchableOpacity>
                </ActionTooltip>
              </View>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <LegendPill label="Today" color={colors.blue} bg={colors.blueDim} textColor={colors.text} />
              <LegendPill label="Selected" color={colors.accent} bg={colors.accentDim} textColor={colors.text} />
              <LegendPill label="Has Event" color={EVENT_TYPE_STYLES.event.color} bg={'rgba(255,107,0,0.12)'} textColor={colors.text} />
              <LegendPill label="🏛️ National Holiday" color={'#6366f1'} bg={'rgba(99,102,241,0.12)'} textColor={colors.text} />
              <LegendPill label="⚠️ Pending Decision" color={'#f59e0b'} bg={'rgba(245,158,11,0.12)'} textColor={colors.text} />
              <LegendPill label="Cancelled Classes" color={colors.red} bg={colors.redDim} textColor={colors.text} />
            </View>
          </GlassCard>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
            <View style={{ flex: isDesktop ? 1.45 : 1 }}>
              <GlassCard
                variant="elevated"
                borderRadius={24}
                accentColor={colors.accent}
                glowColor={isDark ? 'rgba(255,107,0,0.24)' : 'rgba(255,107,0,0.14)'}
                contentStyle={{ padding: isTablet ? 14 : 10 }}
              >
                <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                  {WEEK_DAYS.map((w, idx) => (
                    <View key={w} style={{ width: DAY_COLUMN_WIDTH, alignItems: 'center', paddingVertical: 4 }}>
                      <Text style={{
                        color: idx >= 5 ? colors.accent : colors.textSub,
                        fontWeight: '800',
                        fontSize: 11,
                        letterSpacing: 0.3,
                        textTransform: 'uppercase',
                      }}>
                        {w}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {calendarDays.map((item) => {
                    const dayEvents = eventsByDate.get(item.dateStr) || [];
                    const isSelected = item.dateStr === selectedDateStr;
                    const isToday = item.dateStr === todayStr;
                    const hasCancelClasses = dayEvents.some((entry) => entry.cancel_classes);
                    const markerEvents = dayEvents.slice(0, 3);

                    const cellStyle = [
                      styles.dayCell,
                      {
                        width: DAY_COLUMN_WIDTH,
                        minHeight: isTablet ? 90 : 76,
                        borderColor: isSelected
                          ? colors.accent
                          : isToday
                          ? colors.blue
                          : 'transparent',
                        backgroundColor: isSelected
                          ? colors.accentDim
                          : isToday
                          ? colors.blueDim
                          : 'transparent',
                      },
                    ];

                    return (
                      <TouchableOpacity key={item.dateStr} onPress={() => setSelectedDateStr(item.dateStr)} style={cellStyle} activeOpacity={0.82}>
                        <View style={{ alignItems: 'center', width: '100%' }}>
                          <Text style={{
                            color: isSelected
                              ? colors.accent
                              : !item.isCurrentMonth
                              ? colors.textMuted
                              : colors.text,
                            opacity: item.isCurrentMonth ? 1 : 0.45,
                            fontWeight: '800',
                            fontSize: 12,
                          }}>
                            {item.dayNumber}
                          </Text>

                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, minHeight: 10 }}>
                            {dayEvents.some((e) => e.is_national_holiday) && (
                              <Text style={{ fontSize: 9 }}>🏛️</Text>
                            )}
                            {markerEvents.map((event, idx) => {
                              const marker = getEventTypeStyle(event);
                              return <View key={`${event.id}-${idx}`} style={{ width: 6, height: 6, borderRadius: 99, backgroundColor: marker.color }} />;
                            })}
                            {dayEvents.length > 3 ? (
                              <View style={{ minWidth: 14, height: 14, borderRadius: 99, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
                                <Text style={{ color: colors.textSub, fontSize: 9, fontWeight: '800' }}>+{dayEvents.length - 3}</Text>
                              </View>
                            ) : null}
                          </View>

                          {hasCancelClasses ? (
                            <View style={{ marginTop: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.redDim, borderWidth: 1, borderColor: colors.redBorder }}>
                              <Text style={{ color: colors.red, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Cancelled</Text>
                            </View>
                          ) : dayEvents.some((e) => e.is_national_holiday && e.is_pending_decision) ? (
                            <View style={{ marginTop: 4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' }}>
                              <Text style={{ color: '#b45309', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>Pending</Text>
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </GlassCard>
            </View>

            <View style={{ flex: 1, gap: 14 }}>
              <GlassCard
                variant="modal"
                borderRadius={22}
                accentColor={colors.accent}
                contentStyle={{ padding: 16 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: '900', fontSize: 17 }}>{selectedDateLabel}</Text>
                    <Text style={{ color: colors.textSub, fontSize: 12, marginTop: 2 }}>
                      {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} for selected day
                    </Text>
                  </View>

                  {isAdmin ? (
                    <TouchableOpacity onPress={() => handleOpenCreateModal(selectedDateStr)} style={styles.inlineAddBtn}>
                      <Plus size={13} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={{ marginTop: 12, gap: 10 }}>
                  {loading ? (
                    <View style={{ paddingVertical: 22, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.accent} />
                    </View>
                  ) : selectedEvents.length === 0 ? (
                    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, backgroundColor: colors.surface2 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>No events scheduled</Text>
                      <Text style={{ color: colors.textSub, marginTop: 4, fontSize: 12 }}>
                        Regular class flow applies unless an event is added.
                      </Text>
                    </View>
                  ) : (
                    selectedEvents.map((event) => {
                      const typeChip = getEventTypeStyle(event);
                      return (
                        <View
                          key={event.id}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: event.cancel_classes ? colors.redBorder : colors.border,
                            backgroundColor: event.cancel_classes ? colors.redDim : colors.surface2,
                            padding: 12,
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{event.title}</Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                {event.is_national_holiday ? (
                                  <>
                                    <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#6366f11A', borderWidth: 1, borderColor: '#6366f166' }}>
                                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' }}>🏛️ National Holiday</Text>
                                    </View>
                                    {event.is_provisional && (
                                      <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#f59e0b1A', borderWidth: 1, borderColor: '#f59e0b66' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase' }}>Provisional</Text>
                                      </View>
                                    )}
                                    {event.is_pending_decision ? (
                                      <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#b45309', textTransform: 'uppercase' }}>⚠️ Pending Decision (Classes Run)</Text>
                                      </View>
                                    ) : event.cancel_classes ? (
                                      <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.redDim, borderWidth: 1, borderColor: colors.redBorder }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: colors.red, textTransform: 'uppercase' }}>Classes Cancelled</Text>
                                      </View>
                                    ) : (
                                      <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#22c55e' }}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#15803d', textTransform: 'uppercase' }}>Classes Run Normally</Text>
                                      </View>
                                    )}
                                  </>
                                ) : (
                                  <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: `${typeChip.color}1A`, borderWidth: 1, borderColor: `${typeChip.color}66` }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: typeChip.color, textTransform: 'uppercase' }}>{typeChip.label}</Text>
                                  </View>
                                )}
                                {(event.start_time || event.end_time) ? (
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Clock size={12} color={colors.textSub} style={{ marginRight: 4 }} />
                                    <Text style={{ color: colors.textSub, fontSize: 11, fontWeight: '700' }}>
                                      {event.start_time || 'Start'}{event.end_time ? ` - ${event.end_time}` : ''}
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>

                            {isAdmin ? (
                              event.is_national_holiday ? (
                                <TouchableOpacity
                                  onPress={() => handleOpenDecisionModal(event)}
                                  style={{
                                    backgroundColor: event.is_pending_decision ? '#f59e0b' : '#3b82f6',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                                    {event.is_pending_decision ? 'Set Decision' : 'Change Decision'}
                                  </Text>
                                </TouchableOpacity>
                              ) : (
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                  <TouchableOpacity onPress={() => isReadOnlyAdmin ? showReadOnlyNotice() : handleOpenEditModal(event)} style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Edit event">
                                    <Edit2 size={13} color={colors.textSub} />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => isReadOnlyAdmin ? showReadOnlyNotice() : handleDeleteEvent(event)} style={[styles.iconBtn, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]} accessibilityLabel="Delete event">
                                    <Trash2 size={13} color={colors.red} />
                                  </TouchableOpacity>
                                </View>
                              )
                            ) : null}
                          </View>

                          {event.description ? (
                            <Text style={{ color: colors.textSub, marginTop: 8, fontSize: 12, lineHeight: 18 }}>
                              {event.description}
                            </Text>
                          ) : null}

                          {event.cancel_classes ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                              <AlertTriangle size={13} color={colors.red} style={{ marginRight: 6 }} />
                              <Text style={{ color: colors.red, fontSize: 11, fontWeight: '900' }}>
                                Classes cancelled for this date.
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              </GlassCard>

              <GlassCard
                variant="subtle"
                borderRadius={22}
                accentTop={false}
                contentStyle={{ padding: 16 }}
              >
                <Text style={{ color: colors.text, fontWeight: '900', fontSize: 15 }}>Upcoming Events</Text>
                <Text style={{ color: colors.textSub, marginTop: 2, marginBottom: 10, fontSize: 12 }}>
                  Next scheduled school moments across all dates.
                </Text>

                {upcomingEvents.length === 0 ? (
                  <Text style={{ color: colors.textSub, fontSize: 12 }}>No upcoming events currently scheduled.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {upcomingEvents.map((event) => {
                      const typeChip = getEventTypeStyle(event);
                      return (
                        <TouchableOpacity
                          key={`upcoming-${event.id}`}
                          onPress={() => {
                            setSelectedDateStr(event.event_date);
                            const [y, m] = event.event_date.split('-').map((entry) => Number(entry));
                            if (y && m) setCurrentDate(new Date(y, m - 1, 1));
                          }}
                          style={{
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.surface,
                            padding: 10,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{event.title}</Text>
                              <Text style={{ color: colors.textSub, fontSize: 11, marginTop: 2 }}>
                                {new Date(`${event.event_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                                {event.start_time ? ` • ${event.start_time}` : ''}
                              </Text>
                            </View>
                            <View style={{ borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: `${typeChip.color}1A`, borderWidth: 1, borderColor: `${typeChip.color}66` }}>
                              <Text style={{ color: typeChip.color, fontSize: 10, fontWeight: '800' }}>{typeChip.label}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </GlassCard>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Admin Add/Edit Event Modal */}
      {isAdmin && (
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl ${isDark ? 'bg-[#161B22] border-[#21262D]' : 'bg-white border-gray-200'}`}>
              <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <Text className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {editingEvent ? 'Edit Calendar Event' : 'Create Calendar Event'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)} className="p-1 rounded-full">
                  <X size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                </TouchableOpacity>
              </View>

              <ScrollView className="max-h-[70vh]" showsVerticalScrollIndicator={false}>
                <View className="gap-3.5">
                  <View>
                    <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Event Title *
                    </Text>
                    <TextInput
                      value={formTitle}
                      onChangeText={setFormTitle}
                      placeholder="e.g. Founders Day Celebration"
                      placeholderTextColor="#9CA3AF"
                      className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'bg-[#0D1117] border-[#30363D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </View>

                  <View>
                    <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Event Date (YYYY-MM-DD) *
                    </Text>
                    <TextInput
                      value={formDate}
                      onChangeText={setFormDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                      className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'bg-[#0D1117] border-[#30363D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </View>

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        Start Time
                      </Text>
                      <TextInput
                        value={formStartTime}
                        onChangeText={setFormStartTime}
                        placeholder="08:00"
                        placeholderTextColor="#9CA3AF"
                        className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'bg-[#0D1117] border-[#30363D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        End Time
                      </Text>
                      <TextInput
                        value={formEndTime}
                        onChangeText={setFormEndTime}
                        placeholder="14:00"
                        placeholderTextColor="#9CA3AF"
                        className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'bg-[#0D1117] border-[#30363D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                      />
                    </View>
                  </View>

                  <View>
                    <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Event Description
                    </Text>
                    <TextInput
                      value={formDescription}
                      onChangeText={setFormDescription}
                      placeholder="Details about activities, dress code, parent attendance..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'bg-[#0D1117] border-[#30363D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    />
                  </View>                  {/* Explicit Class Continuation Choice (Mandatory) */}
                  <View className={`p-4 rounded-2xl border ${formCancelClasses === null ? (isDark ? 'bg-amber-500/10 border-amber-500/40' : 'bg-amber-50 border-amber-300') : formCancelClasses ? 'bg-red-500/10 border-red-500/40' : (isDark ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300')}`}>
                    <View className="mb-2">
                      <View className="flex-row items-center justify-between">
                        <Text className={`text-xs font-black ${formCancelClasses === true ? 'text-red-500' : formCancelClasses === false ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                          Class Schedule Decision *
                        </Text>
                        {formCancelClasses === null && (
                          <View className="bg-amber-500/20 px-2 py-0.5 rounded-md">
                            <Text className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Choice Required</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Specify whether regular classes continue alongside this event or if all classes are cancelled.
                      </Text>
                    </View>

                    <View className="flex-row gap-2 mt-2">
                      <TouchableOpacity
                        onPress={() => setFormCancelClasses(false)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border items-center justify-center ${formCancelClasses === false ? 'bg-emerald-600 border-emerald-600 shadow-sm' : isDark ? 'bg-[#0D1117] border-[#30363D]' : 'bg-white border-gray-200'}`}
                      >
                        <Text className={`text-xs font-bold text-center ${formCancelClasses === false ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          Classes Continue
                        </Text>
                        <Text className={`text-[10px] text-center mt-0.5 ${formCancelClasses === false ? 'text-emerald-100' : 'text-gray-400'}`}>
                          Normal Schedule
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setFormCancelClasses(true)}
                        className={`flex-1 py-2.5 px-3 rounded-xl border items-center justify-center ${formCancelClasses === true ? 'bg-red-600 border-red-600 shadow-sm' : isDark ? 'bg-[#0D1117] border-[#30363D]' : 'bg-white border-gray-200'}`}
                      >
                        <Text className={`text-xs font-bold text-center ${formCancelClasses === true ? 'text-white' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          Cancel Classes
                        </Text>
                        <Text className={`text-[10px] text-center mt-0.5 ${formCancelClasses === true ? 'text-red-100' : 'text-gray-400'}`}>
                          No Classes
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Target Audience Selector */}
                  <View className={`p-4 rounded-2xl border ${isDark ? 'bg-[#0D1117] border-[#30363D]' : 'bg-gray-50 border-gray-200'}`}>
                    <View className="flex-row items-center mb-1.5">
                      <Bell size={13} color="#FF6900" style={{ marginRight: 6 }} />
                      <Text className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        Announcement Target Audience
                      </Text>
                    </View>
                    <Text className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5 leading-tight">
                      Controls which roles can see the automated calendar announcement.
                    </Text>

                    <View className="flex-row flex-wrap gap-1.5">
                      {[
                        { key: 'all' as const, label: 'All (School-Wide)' },
                        { key: 'teachers' as const, label: 'Teachers' },
                        { key: 'students' as const, label: 'Students' },
                        { key: 'parents' as const, label: 'Parents' },
                      ].map((item) => {
                        const isSelected = formTargetAudience === item.key;
                        return (
                          <TouchableOpacity
                            key={item.key}
                            onPress={() => setFormTargetAudience(item.key)}
                            className={`px-3 py-1.5 rounded-lg border ${isSelected ? 'bg-[#FF6900] border-[#FF6900]' : isDark ? 'bg-[#161B22] border-[#30363D]' : 'bg-white border-gray-200'}`}
                          >
                            <Text className={`text-xs font-bold ${isSelected ? 'text-white' : isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View className="flex-row justify-end gap-2.5 mt-5 pt-3 border-t border-gray-100 dark:border-gray-800">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className={`px-4 py-2.5 rounded-xl border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}
                >
                  <Text className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Cancel</Text>
                </TouchableOpacity>

                {(() => {
                  const canSave = !!formTitle.trim() && !!formDate.trim() && formCancelClasses !== null && !submitting;
                  return (
                    <TouchableOpacity
                      onPress={handleSaveEvent}
                      disabled={!canSave}
                      style={{ opacity: canSave ? 1 : 0.5 }}
                      className="bg-[#FF6900] px-5 py-2.5 rounded-xl shadow-sm flex-row items-center"
                      accessibilityState={{ disabled: !canSave, busy: submitting }}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <Text className="text-white text-xs font-bold">
                          {editingEvent ? 'Save Changes' : 'Create Event'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Admin Holiday Decision Modal */}
      {isAdmin && (
        <Modal
          visible={decisionModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => !savingDecision && setDecisionModalVisible(false)}
        >
          <View className="flex-1 bg-black/60 justify-center items-center p-4">
            <View className={`w-full max-w-md rounded-3xl p-6 border shadow-2xl ${isDark ? 'bg-[#161B22] border-[#21262D]' : 'bg-white border-gray-200'}`}>
              <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center gap-2">
                  <Text className="text-xl">🏛️</Text>
                  <View>
                    <Text className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      National Holiday Decision
                    </Text>
                    <Text className="text-xs text-gray-500">
                      {selectedHolidayEvent?.event_date}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setDecisionModalVisible(false)} className="p-1 rounded-full">
                  <X size={18} color={isDark ? '#9CA3AF' : '#4B5563'} />
                </TouchableOpacity>
              </View>

              <Text className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedHolidayEvent?.title}
              </Text>
              <Text className="text-xs text-gray-500 mb-4 leading-relaxed">
                Choose whether regular classes are cancelled for this holiday, or if classes run normally while observing the day.
              </Text>

              <View className="gap-3 mb-5">
                {/* Cancel Classes Option */}
                <TouchableOpacity
                  onPress={() => setSelectedDecision('cancel_classes')}
                  activeOpacity={0.8}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: selectedDecision === 'cancel_classes' ? '#ef4444' : (isDark ? '#21262D' : '#e5e7eb'),
                    backgroundColor: selectedDecision === 'cancel_classes' ? (isDark ? '#7f1d1d25' : '#fef2f2') : (isDark ? '#161B22' : '#ffffff'),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: selectedDecision === 'cancel_classes' ? '#ef4444' : (isDark ? '#ffffff' : '#111827') }}>
                      🚫 Cancel Classes (Full Holiday)
                    </Text>
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selectedDecision === 'cancel_classes' ? '#ef4444' : '#9ca3af', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedDecision === 'cancel_classes' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />}
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Classes are suspended. Date will count as a school closure in timetable and attendance.
                  </Text>
                </TouchableOpacity>

                {/* Run Classes Option */}
                <TouchableOpacity
                  onPress={() => setSelectedDecision('run_classes')}
                  activeOpacity={0.8}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: selectedDecision === 'run_classes' ? '#3b82f6' : (isDark ? '#21262D' : '#e5e7eb'),
                    backgroundColor: selectedDecision === 'run_classes' ? (isDark ? '#1e3a8a25' : '#eff6ff') : (isDark ? '#161B22' : '#ffffff'),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: selectedDecision === 'run_classes' ? '#3b82f6' : (isDark ? '#ffffff' : '#111827') }}>
                      📚 Classes Run as Normal (Observance Only)
                    </Text>
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selectedDecision === 'run_classes' ? '#3b82f6' : '#9ca3af', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedDecision === 'run_classes' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' }} />}
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280' }}>
                    School operates on standard timetable. Holiday is marked for awareness without closure.
                  </Text>
                </TouchableOpacity>

                {/* Keep Pending Option */}
                <TouchableOpacity
                  onPress={() => setSelectedDecision('pending')}
                  activeOpacity={0.8}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: selectedDecision === 'pending' ? '#f59e0b' : (isDark ? '#21262D' : '#e5e7eb'),
                    backgroundColor: selectedDecision === 'pending' ? (isDark ? '#78350f25' : '#fef3c7') : (isDark ? '#161B22' : '#ffffff'),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontWeight: '800', fontSize: 13, color: selectedDecision === 'pending' ? '#b45309' : (isDark ? '#ffffff' : '#111827') }}>
                      ⏳ Pending Decision
                    </Text>
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selectedDecision === 'pending' ? '#f59e0b' : '#9ca3af', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedDecision === 'pending' && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#f59e0b' }} />}
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Decision is deferred. Classes run as normal until confirmed.
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Decision Notes (Optional)
                </Text>
                <TextInput
                  value={decisionNotes}
                  onChangeText={setDecisionNotes}
                  placeholder="e.g. Board approved half-day observance"
                  placeholderTextColor="#9CA3AF"
                  className={`px-3.5 py-2.5 rounded-xl border text-sm font-medium ${isDark ? 'bg-[#0D1117] border-[#30363D] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </View>

              <View className="flex-row gap-3">
                <TouchableOpacity
                  disabled={savingDecision}
                  onPress={() => setDecisionModalVisible(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 items-center justify-center"
                >
                  <Text className="text-gray-700 dark:text-gray-300 font-bold text-sm">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={savingDecision}
                  onPress={handleSaveDecision}
                  className="flex-1 py-3 rounded-xl bg-orange-500 items-center justify-center flex-row gap-2"
                >
                  {savingDecision && <ActivityIndicator size="small" color="#fff" />}
                  <Text className="text-white font-bold text-sm">Save Decision</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

export default SchoolCalendarView;

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6900',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6900',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  monthNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCell: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
