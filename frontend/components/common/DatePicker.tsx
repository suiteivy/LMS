import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

// The calendar grid is always 6 rows × 7 cols = 42 cells.
// This keeps height fixed regardless of how many weeks a month spans.
const CELL_SIZE = 36;
const GRID_ROWS = 6;

export function DatePicker({
    label,
    value,
    onChange,
    isDark,
    inline = false, // if true, renders as a row field (for detail screens)
}: {
    label: string;
    value: string;
    onChange: (d: string) => void;
    isDark: boolean;
    inline?: boolean;
}) {
    const [visible, setVisible] = useState(false);
    const today = new Date();
    const parsed = value ? new Date(value + 'T00:00:00') : null;

    const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear() - 10);
    const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();

    // Always render 42 cells (6 weeks) so height is fixed
    const cells = Array.from({ length: 42 }, (_, i) => {
        const day = i - firstDay + 1;
        return day >= 1 && day <= daysInMonth ? day : null;
    });

    const handleSelect = (day: number) => {
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        onChange(`${viewYear}-${mm}-${dd}`);
        setVisible(false);
    };

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    const displayValue = parsed
        ? parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    const selectedDay = parsed?.getMonth() === viewMonth && parsed?.getFullYear() === viewYear
        ? parsed.getDate()
        : null;

    const calBg = isDark ? '#1f2937' : '#ffffff';
    const calText = isDark ? '#f9fafb' : '#111827';
    const mutedText = isDark ? '#9ca3af' : '#6b7280';
    const yearBtnBg = isDark ? '#374151' : '#f3f4f6';
    const yearBtnText = isDark ? '#e5e7eb' : '#374151';

    const trigger = inline ? (
        <View style={{ flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#1f2937' : '#f9fafb' }}>
            <Text style={{ width: '40%', color: mutedText, fontWeight: '500', fontSize: 13 }}>{label}</Text>
            <TouchableOpacity onPress={() => setVisible(true)} style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={{ color: displayValue ? calText : mutedText, fontStyle: displayValue ? 'normal' : 'italic', fontSize: 13, fontWeight: '500' }}>
                    {displayValue ?? 'Tap to set'}
                </Text>
            </TouchableOpacity>
        </View>
    ) : (
        <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: mutedText, marginBottom: 6 }}>{label}</Text>
            <TouchableOpacity
                onPress={() => setVisible(true)}
                style={{
                    backgroundColor: isDark ? '#1f2937' : '#f9fafb',
                    borderWidth: 1,
                    borderColor: isDark ? '#374151' : '#e5e7eb',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Text style={{ color: displayValue ? calText : mutedText, fontWeight: '500' }}>
                    {displayValue ?? 'Select date'}
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
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{ backgroundColor: calBg, borderRadius: 20, padding: 20, width: 320 }}
                        onPress={() => {}}
                    >
                        {/* Month navigation */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <TouchableOpacity onPress={prevMonth} style={{ padding: 6 }}>
                                <Ionicons name="chevron-back" size={20} color={calText} />
                            </TouchableOpacity>
                            <Text style={{ fontWeight: '700', fontSize: 15, color: calText }}>
                                {MONTHS[viewMonth]} {viewYear}
                            </Text>
                            <TouchableOpacity onPress={nextMonth} style={{ padding: 6 }}>
                                <Ionicons name="chevron-forward" size={20} color={calText} />
                            </TouchableOpacity>
                        </View>

                        {/* Year quick buttons */}
                        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
                            <TouchableOpacity onPress={() => setViewYear(y => y - 1)} style={{ backgroundColor: yearBtnBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                                <Text style={{ color: yearBtnText, fontWeight: '600', fontSize: 12 }}>{viewYear - 1}</Text>
                            </TouchableOpacity>
                            <View style={{ backgroundColor: '#FF6B00', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                                <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{viewYear}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setViewYear(y => y + 1)} style={{ backgroundColor: yearBtnBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                                <Text style={{ color: yearBtnText, fontWeight: '600', fontSize: 12 }}>{viewYear + 1}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Day headers */}
                        <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                            {DAYS.map(d => (
                                <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: mutedText }}>{d}</Text>
                            ))}
                        </View>

                        {/* Fixed 6-row grid */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', height: CELL_SIZE * GRID_ROWS }}>
                            {cells.map((day, i) => {
                                if (!day) return <View key={`e-${i}`} style={{ width: `${100/7}%`, height: CELL_SIZE }} />;
                                const isSelected = selectedDay === day;
                                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                                return (
                                    <TouchableOpacity
                                        key={`d-${day}-${i}`}
                                        onPress={() => handleSelect(day)}
                                        style={{ width: `${100/7}%`, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <View style={{
                                            width: 30, height: 30, borderRadius: 15,
                                            alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isSelected ? '#FF6B00' : isToday ? (isDark ? '#431407' : '#fff7ed') : 'transparent',
                                            borderWidth: isToday && !isSelected ? 1 : 0,
                                            borderColor: '#FF6B00',
                                        }}>
                                            <Text style={{
                                                fontSize: 13,
                                                fontWeight: isSelected || isToday ? '700' : '400',
                                                color: isSelected ? 'white' : isToday ? '#FF6B00' : calText,
                                            }}>
                                                {day}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Cancel */}
                        <TouchableOpacity
                            onPress={() => setVisible(false)}
                            style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: isDark ? '#374151' : '#f3f4f6', borderRadius: 12 }}
                        >
                            <Text style={{ color: mutedText, fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
}