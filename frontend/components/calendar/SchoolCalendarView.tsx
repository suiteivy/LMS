import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedHeader } from '@/components/common/UnifiedHeader';
import {
  CalendarAPI,
  CalendarEvent,
  CreateCalendarEventDto,
} from '@/services/CalendarService';
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

export function SchoolCalendarView({ roleTitle, userRole, onBack }: SchoolCalendarViewProps) {
  const { isDark } = useTheme();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'master_admin' || userRole === 'admin';

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
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formEventType, setFormEventType] = useState('event');
  const [formCancelClasses, setFormCancelClasses] = useState(false);
  const [formExpiryDays, setFormExpiryDays] = useState('7');

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

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

  // Calendar Grid calculation (Monday-first)
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
    const remaining = 35 - days.length;
    if (remaining > 0) {
      for (let d = 1; d <= remaining; d++) {
        const m = currentMonth + 2 > 12 ? 1 : currentMonth + 2;
        const y = currentMonth + 2 > 12 ? currentYear + 1 : currentYear;
        const pad = String(m).padStart(2, '0');
        const padD = String(d).padStart(2, '0');
        days.push({ dateStr: `${y}-${pad}-${padD}`, dayNumber: d, isCurrentMonth: false });
      }
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

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleOpenCreateModal = (dateStr?: string) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(dateStr || selectedDateStr);
    setFormStartTime('08:00');
    setFormEndTime('10:00');
    setFormEventType('event');
    setFormCancelClasses(false);
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
    setFormCancelClasses(event.cancel_classes);
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
      showError('Save Failed', err?.response?.data?.error || err?.message || 'Failed to save event');
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
    <View className={`flex-1 ${isDark ? 'bg-[#0F0B2E]' : 'bg-[#F8FAFC]'}`}>
      <UnifiedHeader
        title="School Calendar"
        subtitle="Events & Schedules"
        role={resolvedRoleTitle}
        onBack={onBack}
        rightActions={
          <View className="flex-row items-center gap-2">
            {isAdmin && (
              <TouchableOpacity
                onPress={() => handleOpenCreateModal()}
                className="flex-row items-center bg-[#FF6900] px-3.5 py-1.5 rounded-full shadow-sm"
                accessibilityRole="button"
                accessibilityLabel="Create Calendar Event"
              >
                <Plus size={15} color="#ffffff" style={{ marginRight: 4 }} />
                <Text className="text-white font-bold text-xs">Add Event</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={fetchEvents}
              className={`p-2 rounded-full border ${isDark ? 'bg-[#161B22] border-[#21262D]' : 'bg-white border-gray-200'}`}
              accessibilityRole="button"
              accessibilityLabel="Refresh Events"
            >
              <RefreshCw size={15} color={isDark ? '#9CA3AF' : '#4B5563'} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView className="flex-1 p-4 md:p-6" showsVerticalScrollIndicator={false}>
        {/* Month Navigation Bar */}
        <View className={`flex-row justify-between items-center px-4 py-3 rounded-2xl mb-4 border ${isDark ? 'bg-[#161B22] border-[#21262D]' : 'bg-white border-gray-100'} shadow-sm`}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            className={`p-2 rounded-xl border ${isDark ? 'bg-[#21262D] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
            accessibilityLabel="Previous month"
          >
            <ChevronLeft size={18} color={isDark ? '#E5E7EB' : '#1F2937'} />
          </TouchableOpacity>

          <View className="items-center">
            <Text className={`font-black text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <Text className={`text-[11px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {events.length} event{events.length !== 1 ? 's' : ''} scheduled
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            className={`p-2 rounded-xl border ${isDark ? 'bg-[#21262D] border-gray-700' : 'bg-gray-50 border-gray-200'}`}
            accessibilityLabel="Next month"
          >
            <ChevronRight size={18} color={isDark ? '#E5E7EB' : '#1F2937'} />
          </TouchableOpacity>
        </View>

        {/* Days of week Header */}
        <View className="flex-row mb-2">
          {WEEK_DAYS.map((w, idx) => (
            <View key={w} className="flex-1 items-center py-1">
              <Text className={`text-[11px] font-bold uppercase tracking-wider ${idx >= 5 ? 'text-orange-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {w}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Day Grid */}
        <View className={`rounded-3xl border overflow-hidden mb-6 p-2 ${isDark ? 'bg-[#161B22] border-[#21262D]' : 'bg-white border-gray-100'} shadow-sm`}>
          <View className="flex-row flex-wrap">
            {calendarDays.map((item) => {
              const dayEvents = eventsByDate.get(item.dateStr) || [];
              const isSelected = item.dateStr === selectedDateStr;
              const hasCancelClasses = dayEvents.some((e) => e.cancel_classes);
              const isToday = item.dateStr === new Date().toISOString().split('T')[0];

              return (
                <TouchableOpacity
                  key={item.dateStr}
                  onPress={() => setSelectedDateStr(item.dateStr)}
                  activeOpacity={0.7}
                  style={{ width: '14.28%', minHeight: 62 }}
                  className={`p-1.5 items-center justify-between rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#FF6900] bg-orange-500/10'
                      : isToday
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : 'border-transparent'
                  }`}
                >
                  <View className="items-center">
                    <Text
                      className={`text-xs font-bold ${
                        isSelected
                          ? 'text-[#FF6900]'
                          : !item.isCurrentMonth
                          ? 'text-gray-400 opacity-40'
                          : isDark
                          ? 'text-gray-200'
                          : 'text-gray-800'
                      }`}
                    >
                      {item.dayNumber}
                    </Text>
                  </View>

                  {/* Event Badges on Day */}
                  <View className="flex-row gap-1 items-center mt-1">
                    {dayEvents.slice(0, 3).map((e, eIdx) => (
                      <View
                        key={e.id || eIdx}
                        className={`w-2 h-2 rounded-full ${
                          e.cancel_classes ? 'bg-red-500' : 'bg-[#FF6900]'
                        }`}
                      />
                    ))}
                  </View>

                  {hasCancelClasses && (
                    <Text className="text-[8px] font-black text-red-500 uppercase tracking-tighter mt-0.5">
                      No Class
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Events Section */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-3 px-1">
            <View>
              <Text className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedEvents.length} scheduled event{selectedEvents.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {isAdmin && (
              <TouchableOpacity
                onPress={() => handleOpenCreateModal(selectedDateStr)}
                className="flex-row items-center bg-[#FF6900] px-3 py-1.5 rounded-full"
              >
                <Plus size={13} color="#ffffff" style={{ marginRight: 4 }} />
                <Text className="text-white text-xs font-bold">Add Event</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View className="p-8 items-center">
              <ActivityIndicator color="#FF6900" size="small" />
            </View>
          ) : selectedEvents.length === 0 ? (
            <View className={`p-8 rounded-3xl border items-center justify-center ${isDark ? 'bg-[#161B22] border-[#21262D]' : 'bg-white border-gray-100'}`}>
              <CalendarIcon size={32} color={isDark ? '#4B5563' : '#9CA3AF'} style={{ marginBottom: 8 }} />
              <Text className={`text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                No events scheduled for this day
              </Text>
              <Text className={`text-xs mt-1 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Regular academic schedule applies unless specified.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {selectedEvents.map((event) => (
                <View
                  key={event.id}
                  className={`p-4 rounded-3xl border ${
                    event.cancel_classes
                      ? isDark
                        ? 'bg-red-950/30 border-red-800/60'
                        : 'bg-red-50 border-red-200'
                      : isDark
                      ? 'bg-[#161B22] border-[#21262D]'
                      : 'bg-white border-gray-100'
                  } shadow-sm`}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className={`text-base font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {event.title}
                        </Text>
                        <View className="bg-orange-500/20 px-2 py-0.5 rounded-md">
                          <Text className="text-[#FF6900] text-[10px] font-bold uppercase">
                            {event.event_type || 'Event'}
                          </Text>
                        </View>
                      </View>

                      {(event.start_time || event.end_time) && (
                        <View className="flex-row items-center mt-1">
                          <Clock size={13} color={isDark ? '#9CA3AF' : '#6B7280'} style={{ marginRight: 4 }} />
                          <Text className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            {event.start_time || 'Start'} {event.end_time ? `- ${event.end_time}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    {isAdmin && (
                      <View className="flex-row items-center gap-2">
                        <TouchableOpacity
                          onPress={() => handleOpenEditModal(event)}
                          className={`p-2 rounded-full ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}
                          accessibilityLabel="Edit event"
                        >
                          <Edit2 size={14} color={isDark ? '#9CA3AF' : '#4B5563'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteEvent(event)}
                          className={`p-2 rounded-full ${isDark ? 'bg-red-950/60' : 'bg-red-50'}`}
                          accessibilityLabel="Delete event"
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {event.description ? (
                    <Text className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {event.description}
                    </Text>
                  ) : null}

                  {/* Cancellation Banner */}
                  {event.cancel_classes && (
                    <View className="flex-row items-center bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 mt-3">
                      <AlertTriangle size={15} color="#EF4444" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-black text-red-500 flex-1">
                        All classes are CANCELLED on this date.
                      </Text>
                    </View>
                  )}

                  {/* Linked Announcement indicator */}
                  {event.announcement_id && (
                    <View className="flex-row items-center mt-2.5">
                      <Bell size={12} color="#10B981" style={{ marginRight: 4 }} />
                      <Text className="text-[10px] font-bold text-emerald-500">
                        School-wide announcement published
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
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
                  </View>

                  {/* Class Cancellation Choice */}
                  <View className={`p-4 rounded-2xl border ${formCancelClasses ? 'bg-red-500/10 border-red-500/40' : isDark ? 'bg-[#0D1117] border-[#30363D]' : 'bg-gray-50 border-gray-200'}`}>
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1 mr-3">
                        <Text className={`text-xs font-black ${formCancelClasses ? 'text-red-500' : isDark ? 'text-white' : 'text-gray-900'}`}>
                          Cancel All Classes on This Day
                        </Text>
                        <Text className="text-[11px] text-gray-400 mt-0.5">
                          Timetable and attendance modules will show &quot;No classes scheduled&quot; for this date.
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setFormCancelClasses(!formCancelClasses)}
                        className={`w-12 h-6 rounded-full p-0.5 transition-all ${formCancelClasses ? 'bg-red-500 items-end' : 'bg-gray-300 dark:bg-gray-700 items-start'}`}
                      >
                        <View className="w-5 h-5 rounded-full bg-white shadow-sm" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Auto Announcement Details */}
                  <View className="p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <View className="flex-row items-center mb-1">
                      <Bell size={13} color="#FF6900" style={{ marginRight: 6 }} />
                      <Text className="text-xs font-bold text-[#FF6900]">
                        Automatic Announcement
                      </Text>
                    </View>
                    <Text className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                      A school-wide announcement will be posted automatically to notify teachers, students, and parents.
                    </Text>
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

                <TouchableOpacity
                  onPress={handleSaveEvent}
                  disabled={submitting}
                  className="bg-[#FF6900] px-5 py-2.5 rounded-xl shadow-sm flex-row items-center"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-white text-xs font-bold">
                      {editingEvent ? 'Save Changes' : 'Create Event'}
                    </Text>
                  )}
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
