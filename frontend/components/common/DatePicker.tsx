import { Ionicons } from '@expo/vector-icons';
import React, { useState, useMemo } from 'react';
import { Modal, Text, TouchableOpacity, View, ScrollView } from 'react-native';

const CELL_SIZE = 36;
const GRID_ROWS = 6;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─────────────────────────────────────────────────────────────────────────────
// Shared Calendar Grid Component (Used by Single and Range Pickers)
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarGridProps {
  viewYear: number;
  viewMonth: number;
  onSelectDay: (day: number) => void;
  isDark: boolean;
  selectedDate?: string | null; // 'YYYY-MM-DD'
  rangeStart?: string | null; // 'YYYY-MM-DD'
  rangeEnd?: string | null; // 'YYYY-MM-DD'
  hoverDate?: string | null;
  minDate?: string; // 'YYYY-MM-DD'
  maxDate?: string; // 'YYYY-MM-DD'
}

function CalendarGrid({
  viewYear,
  viewMonth,
  onSelectDay,
  isDark,
  selectedDate,
  rangeStart,
  rangeEnd,
  minDate,
  maxDate,
}: CalendarGridProps) {
  const today = new Date();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const cells = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => {
      const day = i - firstDay + 1;
      return day >= 1 && day <= daysInMonth ? day : null;
    });
  }, [firstDay, daysInMonth]);

  const calText = isDark ? '#f9fafb' : '#111827';
  const disabledText = isDark ? '#4b5563' : '#d1d5db';

  const getDateStr = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${viewYear}-${mm}-${dd}`;
  };

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', height: CELL_SIZE * GRID_ROWS }}>
      {cells.map((day, i) => {
        if (!day) return <View key={`e-${i}`} style={{ width: `${100 / 7}%`, height: CELL_SIZE }} />;

        const cellDateStr = getDateStr(day);
        const isDisabled = Boolean(
          (minDate && cellDateStr < minDate) ||
          (maxDate && cellDateStr > maxDate)
        );
        const isSingleSelected = selectedDate === cellDateStr;
        const isRangeStart = rangeStart === cellDateStr;
        const isRangeEnd = rangeEnd === cellDateStr;
        const isInRange =
          rangeStart &&
          rangeEnd &&
          cellDateStr > rangeStart &&
          cellDateStr < rangeEnd;
        const isToday =
          day === today.getDate() &&
          viewMonth === today.getMonth() &&
          viewYear === today.getFullYear();

        return (
          <TouchableOpacity
            key={`d-${day}-${i}`}
            onPress={() => !isDisabled && onSelectDay(day)}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={{
              width: `${100 / 7}%`,
              height: CELL_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isInRange ? (isDark ? 'rgba(255,105,0,0.2)' : '#fff7ed') : 'transparent',
              borderTopLeftRadius: isRangeStart ? 16 : 0,
              borderBottomLeftRadius: isRangeStart ? 16 : 0,
              borderTopRightRadius: isRangeEnd ? 16 : 0,
              borderBottomRightRadius: isRangeEnd ? 16 : 0,
              opacity: isDisabled ? 0.35 : 1,
            }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  isSingleSelected || isRangeStart || isRangeEnd
                    ? '#FF6900'
                    : isToday
                    ? isDark
                      ? '#431407'
                      : '#ffedd5'
                    : 'transparent',
                borderWidth: isToday && !isSingleSelected && !isRangeStart && !isRangeEnd ? 1 : 0,
                borderColor: '#FF6900',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: isSingleSelected || isRangeStart || isRangeEnd || isToday ? '700' : '400',
                  color: isSingleSelected || isRangeStart || isRangeEnd ? '#ffffff' : isDisabled ? disabledText : isToday ? '#FF6900' : calText,
                }}
              >
                {day}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Single DatePicker Component
// ─────────────────────────────────────────────────────────────────────────────

export interface DatePickerProps {
  label?: string;
  value: string; // 'YYYY-MM-DD'
  onChange: (d: string) => void;
  isDark: boolean;
  inline?: boolean;
  placeholder?: string;
  minDate?: string; // 'YYYY-MM-DD'
  maxDate?: string; // 'YYYY-MM-DD'
}

export function DatePicker({
  label,
  value,
  onChange,
  isDark,
  inline = false,
  placeholder = 'Select date',
  minDate,
  maxDate,
}: DatePickerProps) {
  const [visible, setVisible] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

  const handleSelect = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setVisible(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const calBg = isDark ? '#161B22' : '#ffffff';
  const calText = isDark ? '#f9fafb' : '#111827';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';
  const yearBtnBg = isDark ? '#21262D' : '#f3f4f6';
  const yearBtnText = isDark ? '#e5e7eb' : '#374151';

  const trigger = inline ? (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#21262D' : '#f3f4f6',
      }}
    >
      {label && <Text style={{ width: '40%', color: mutedText, fontWeight: '500', fontSize: 13 }}>{label}</Text>}
      <TouchableOpacity onPress={() => setVisible(true)} style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text
          style={{
            color: displayValue ? calText : mutedText,
            fontStyle: displayValue ? 'normal' : 'italic',
            fontSize: 13,
            fontWeight: '500',
          }}
        >
          {displayValue ?? placeholder}
        </Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={{ fontSize: 13, fontWeight: '600', color: mutedText, marginBottom: 6 }}>{label}</Text>}
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={{
          backgroundColor: isDark ? '#161B22' : '#f9fafb',
          borderWidth: 1,
          borderColor: isDark ? '#30363D' : '#e5e7eb',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: displayValue ? calText : mutedText, fontWeight: '500' }}>
          {displayValue ?? placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={18} color={mutedText} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {trigger}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: calBg,
              borderRadius: 24,
              padding: 20,
              width: 330,
              borderWidth: 1,
              borderColor: isDark ? '#30363D' : '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 8,
            }}
            onPress={() => {}}
          >
            {/* Header / Month Navigation */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity onPress={prevMonth} style={{ padding: 6, borderRadius: 8, backgroundColor: yearBtnBg }}>
                <Ionicons name="chevron-back" size={18} color={calText} />
              </TouchableOpacity>
              <Text style={{ fontWeight: '700', fontSize: 16, color: calText }}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={{ padding: 6, borderRadius: 8, backgroundColor: yearBtnBg }}>
                <Ionicons name="chevron-forward" size={18} color={calText} />
              </TouchableOpacity>
            </View>

            {/* Year quick switcher */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setViewYear((y) => y - 1)}
                style={{ backgroundColor: yearBtnBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}
              >
                <Text style={{ color: yearBtnText, fontWeight: '600', fontSize: 12 }}>{viewYear - 1}</Text>
              </TouchableOpacity>
              <View style={{ backgroundColor: '#FF6900', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{viewYear}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setViewYear((y) => y + 1)}
                style={{ backgroundColor: yearBtnBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}
              >
                <Text style={{ color: yearBtnText, fontWeight: '600', fontSize: 12 }}>{viewYear + 1}</Text>
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {DAYS.map((d) => (
                <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: mutedText }}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <CalendarGrid
              viewYear={viewYear}
              viewMonth={viewMonth}
              onSelectDay={handleSelect}
              isDark={isDark}
              selectedDate={value}
              minDate={minDate}
              maxDate={maxDate}
            />

            {/* Action buttons: Today & Cancel */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  const now = new Date();
                  const mm = String(now.getMonth() + 1).padStart(2, '0');
                  const dd = String(now.getDate()).padStart(2, '0');
                  onChange(`${now.getFullYear()}-${mm}-${dd}`);
                  setVisible(false);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isDark ? '#21262D' : '#f3f4f6',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: calText, fontWeight: '600', fontSize: 13 }}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: isDark ? '#21262D' : '#f3f4f6',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: mutedText, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DateRangePicker Component (Start & End Date in One Shared Component)
// ─────────────────────────────────────────────────────────────────────────────

export interface DateRangePickerProps {
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  onRangeChange: (range: { startDate: string; endDate: string }) => void;
  isDark: boolean;
  label?: string;
  placeholder?: string;
  allowClear?: boolean;
  minDate?: string; // 'YYYY-MM-DD'
  maxDate?: string; // 'YYYY-MM-DD'
}

export function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  isDark,
  label,
  placeholder = 'Select date range',
  allowClear = true,
  minDate,
  maxDate,
}: DateRangePickerProps) {
  const [visible, setVisible] = useState(false);
  const today = new Date();

  const [tempStart, setTempStart] = useState<string>(startDate);
  const [tempEnd, setTempEnd] = useState<string>(endDate);

  const initialBase = startDate ? new Date(startDate + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initialBase.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialBase.getMonth());

  const calBg = isDark ? '#161B22' : '#ffffff';
  const calText = isDark ? '#f9fafb' : '#111827';
  const mutedText = isDark ? '#9ca3af' : '#6b7280';
  const yearBtnBg = isDark ? '#21262D' : '#f3f4f6';
  const yearBtnText = isDark ? '#e5e7eb' : '#374151';

  const handleOpen = () => {
    setTempStart(startDate);
    setTempEnd(endDate);
    const base = startDate ? new Date(startDate + 'T00:00:00') : today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setVisible(true);
  };

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const clickedDate = `${viewYear}-${mm}-${dd}`;

    if (!tempStart || (tempStart && tempEnd)) {
      // Start a new range
      setTempStart(clickedDate);
      setTempEnd('');
    } else if (tempStart && !tempEnd) {
      if (clickedDate < tempStart) {
        setTempEnd(tempStart);
        setTempStart(clickedDate);
      } else {
        setTempEnd(clickedDate);
      }
    }
  };

  const applyPreset = (preset: 'today' | '7days' | '30days' | 'month' | 'clear') => {
    const now = new Date();
    const toStr = (d: Date) => {
      const year = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${m}-${day}`;
    };

    if (preset === 'clear') {
      setTempStart('');
      setTempEnd('');
      return;
    }

    const todayStr = toStr(now);
    if (preset === 'today') {
      setTempStart(todayStr);
      setTempEnd(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setTempStart(toStr(past));
      setTempEnd(todayStr);
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setTempStart(toStr(past));
      setTempEnd(todayStr);
    } else if (preset === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      setTempStart(toStr(first));
      setTempEnd(todayStr);
    }
  };

  const handleApply = () => {
    onRangeChange({
      startDate: tempStart,
      endDate: tempEnd || tempStart,
    });
    setVisible(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formatDateShort = (dStr: string) => {
    if (!dStr) return '';
    const d = new Date(dStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const displayRange =
    startDate && endDate
      ? `${formatDateShort(startDate)} – ${formatDateShort(endDate)}`
      : startDate
      ? `From ${formatDateShort(startDate)}`
      : null;

  return (
    <>
      <TouchableOpacity
        onPress={handleOpen}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: isDark ? '#161B22' : '#F6F8FA',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? '#30363D' : '#D0D7DE',
          gap: 8,
        }}
      >
        <Ionicons name="calendar" size={15} color="#FF6900" />
        <Text style={{ fontSize: 12, fontWeight: '600', color: displayRange ? calText : mutedText }}>
          {displayRange ?? placeholder}
        </Text>
        {allowClear && (startDate || endDate) && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onRangeChange({ startDate: '', endDate: '' });
            }}
            style={{ padding: 2 }}
          >
            <Ionicons name="close-circle" size={14} color={mutedText} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              backgroundColor: calBg,
              borderRadius: 24,
              padding: 20,
              width: 340,
              borderWidth: 1,
              borderColor: isDark ? '#30363D' : '#e5e7eb',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 8,
            }}
            onPress={() => {}}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: calText, marginBottom: 12 }}>
              {label || 'Select Date Range'}
            </Text>

            {/* Presets */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(['today', '7days', '30days', 'month', 'clear'] as const).map((p) => {
                const pLabel =
                  p === 'today'
                    ? 'Today'
                    : p === '7days'
                    ? 'Last 7d'
                    : p === '30days'
                    ? 'Last 30d'
                    : p === 'month'
                    ? 'This Month'
                    : 'Clear';
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => applyPreset(p)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: yearBtnBg,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: p === 'clear' ? '#ef4444' : calText }}>
                      {pLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Month Nav */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <TouchableOpacity onPress={prevMonth} style={{ padding: 6, borderRadius: 8, backgroundColor: yearBtnBg }}>
                <Ionicons name="chevron-back" size={18} color={calText} />
              </TouchableOpacity>
              <Text style={{ fontWeight: '700', fontSize: 15, color: calText }}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <TouchableOpacity onPress={nextMonth} style={{ padding: 6, borderRadius: 8, backgroundColor: yearBtnBg }}>
                <Ionicons name="chevron-forward" size={18} color={calText} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: 'row', marginBottom: 6 }}>
              {DAYS.map((d) => (
                <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: mutedText }}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Grid */}
            <CalendarGrid
              viewYear={viewYear}
              viewMonth={viewMonth}
              onSelectDay={handleSelectDay}
              isDark={isDark}
              rangeStart={tempStart}
              rangeEnd={tempEnd}
              minDate={minDate}
              maxDate={maxDate}
            />

            {/* Range Selection Feedback */}
            <View
              style={{
                marginTop: 12,
                padding: 10,
                backgroundColor: isDark ? '#21262D' : '#f8fafc',
                borderRadius: 12,
                flexDirection: 'row',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 12, color: mutedText }}>
                From: <Text style={{ fontWeight: '700', color: calText }}>{tempStart || '–'}</Text>
              </Text>
              <Text style={{ fontSize: 12, color: mutedText }}>
                To: <Text style={{ fontWeight: '700', color: calText }}>{tempEnd || tempStart || '–'}</Text>
              </Text>
            </View>

            {/* Apply / Cancel */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: isDark ? '#21262D' : '#f3f4f6',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: mutedText, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: '#FF6900',
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}