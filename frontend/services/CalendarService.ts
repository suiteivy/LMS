import { api } from "./api";

const getCalendarErrorMessage = (error: any, fallback: string) => {
  const status = Number(error?.response?.status || 0);
  const code = String(error?.response?.data?.code || '');

  if (status === 400) return 'Invalid calendar request. Please check the selected date and try again.';
  if (status === 401 || status === 403) return 'Your session does not have permission for this calendar action.';
  if (status === 404) return 'Calendar resource not found.';
  if (status >= 500) return 'Calendar service is temporarily unavailable. Please try again shortly.';
  if (code === 'ERR_NETWORK' || /network/i.test(String(error?.message || ''))) {
    return 'Network connection issue while loading calendar data.';
  }

  return fallback;
};

export interface CalendarEvent {
  id: string;
  institution_id: string;
  created_by?: string | null;
  title: string;
  description?: string | null;
  event_date: string; // YYYY-MM-DD
  start_date: string; // YYYY-MM-DD (formalized multi-day start)
  end_date: string; // YYYY-MM-DD (formalized multi-day end)
  start_time?: string | null;
  end_time?: string | null;
  event_type?: 'event' | 'holiday' | 'exam' | 'meeting' | string;
  cancel_classes: boolean;
  announcement_id?: string | null;
  metadata?: Record<string, any>;
  is_national_holiday?: boolean;
  national_holiday_id?: string;
  decision?: 'pending' | 'cancel_classes' | 'run_classes';
  is_pending_decision?: boolean;
  is_provisional?: boolean;
  country_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  event_date: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  event_type?: string;
  cancel_classes: boolean;
  target_audience?: 'all' | 'parents' | 'teachers' | 'students';
  announcement_expiry_days?: number;
}

export interface CancelledDateInfo {
  id: string;
  event_date: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export interface NationalHoliday {
  id: string;
  name: string;
  holiday_date: string; // YYYY-MM-DD
  is_provisional: boolean;
  country_code: string;
  year?: number;
  decision?: 'pending' | 'cancel_classes' | 'run_classes';
  cancels_classes?: boolean;
  is_pending_decision?: boolean;
  decision_notes?: string | null;
  decided_at?: string | null;
  decided_by?: string | null;
}

export interface NationalHolidaysResponse {
  country_code: string;
  country_name: string;
  holidays: NationalHoliday[];
  pending_count: number;
}

export const EAST_AFRICAN_COUNTRIES = [
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴' },
];

export const CalendarAPI = {
  getEvents: async (params?: { start_date?: string; end_date?: string; month?: number; year?: number }): Promise<CalendarEvent[]> => {
    try {
      const response = await api.get("/calendar/events", {
        params,
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data?.events || [];
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to load calendar events.'));
    }
  },

  createEvent: async (data: CreateCalendarEventDto): Promise<{ event: CalendarEvent; announcement_created: boolean }> => {
    try {
      const response = await api.post("/calendar/events", data, {
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to create calendar event.'));
    }
  },

  updateEvent: async (id: string, data: Partial<CreateCalendarEventDto>): Promise<CalendarEvent> => {
    try {
      const response = await api.put(`/calendar/events/${id}`, data, {
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data?.event;
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to update calendar event.'));
    }
  },

  deleteEvent: async (id: string): Promise<void> => {
    try {
      await api.delete(`/calendar/events/${id}`, {
        skipErrorToast: true,
        skipErrorLog: true,
      });
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to delete calendar event.'));
    }
  },

  getCancelledDates: async (): Promise<CancelledDateInfo[]> => {
    try {
      const response = await api.get("/calendar/cancelled-dates", {
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data?.cancelled_dates || [];
    } catch {
      return [];
    }
  },

  getNationalHolidays: async (params?: { year?: number; month?: number; start_date?: string; end_date?: string }): Promise<NationalHolidaysResponse> => {
    try {
      const response = await api.get("/calendar/holidays", {
        params,
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data || { country_code: 'KE', country_name: 'Kenya', holidays: [], pending_count: 0 };
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to load national holidays.'));
    }
  },

  syncNationalHolidays: async (countryCode?: string): Promise<NationalHolidaysResponse> => {
    try {
      const response = await api.post("/calendar/holidays/sync", { country_code: countryCode }, {
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to sync national holidays.'));
    }
  },

  setHolidayDecision: async (
    holidayId: string,
    decision: 'cancel_classes' | 'run_classes' | 'pending',
    notes?: string
  ): Promise<{ message: string; holiday: NationalHoliday }> => {
    try {
      const response = await api.post(`/calendar/holidays/${holidayId}/decision`, {
        decision,
        notes,
      }, {
        skipErrorToast: true,
        skipErrorLog: true,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(getCalendarErrorMessage(error, 'Failed to save holiday decision.'));
    }
  },
};
