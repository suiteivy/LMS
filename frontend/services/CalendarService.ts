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
  start_time?: string | null;
  end_time?: string | null;
  event_type?: 'event' | 'holiday' | 'exam' | 'meeting' | string;
  cancel_classes: boolean;
  announcement_id?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  event_type?: string;
  cancel_classes?: boolean;
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
};
