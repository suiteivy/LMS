import React from 'react';
import SchoolCalendarView from '@/components/calendar/SchoolCalendarView';

export default function AdminCalendarScreen() {
    return <SchoolCalendarView userRole="admin" />;
}
