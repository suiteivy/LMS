import { api } from "./api";

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
      const response = await api.get("/calendar/events", { params });
      return response.data?.events || [];
    } catch (error) {
      console.error("Get calendar events error:", error);
      throw error;
    }
  },

  createEvent: async (data: CreateCalendarEventDto): Promise<{ event: CalendarEvent; announcement_created: boolean }> => {
    try {
      const response = await api.post("/calendar/events", data);
      return response.data;
    } catch (error) {
      console.error("Create calendar event error:", error);
      throw error;
    }
  },

  updateEvent: async (id: string, data: Partial<CreateCalendarEventDto>): Promise<CalendarEvent> => {
    try {
      const response = await api.put(`/calendar/events/${id}`, data);
      return response.data?.event;
    } catch (error) {
      console.error("Update calendar event error:", error);
      throw error;
    }
  },

  deleteEvent: async (id: string): Promise<void> => {
    try {
      await api.delete(`/calendar/events/${id}`);
    } catch (error) {
      console.error("Delete calendar event error:", error);
      throw error;
    }
  },

  getCancelledDates: async (): Promise<CancelledDateInfo[]> => {
    try {
      const response = await api.get("/calendar/cancelled-dates");
      return response.data?.cancelled_dates || [];
    } catch (error) {
      console.error("Get cancelled dates error:", error);
      return [];
    }
  },
};
