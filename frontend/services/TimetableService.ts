import { api } from "./api";

// Types
export interface TimetableEntry {
    id: string;
    class_id: string;
    subject_id: string;
    teacher_id?: string;
    track_id?: string | null;
    day_of_week: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
    start_time: string;
    end_time: string;
    period_number?: number;
    room_number?: string;
    institution_id: string;
    is_draft?: boolean;
    teacher_name?: string;
    subject_name?: string;
    subjects?: {
        id?: string;
        title: string;
        category?: string;
        teacher_id?: string;
        teachers?: {
            id?: string;
            full_name?: string;
            users?: {
                first_name?: string;
                last_name?: string;
                full_name?: string;
            };
        };
    };
    teachers?: {
        id?: string;
        full_name?: string;
        users?: {
            full_name?: string;
        };
    };
    classes?: {
        id?: string;
        display_name?: string;
        name?: string;
        grade_level?: string;
        stream?: string;
    };
}

export interface CreateTimetableDto {
    class_id: string;
    subject_id: string;
    teacher_id?: string;
    track_id?: string | null;
    day_of_week: string;
    start_time: string;
    end_time: string;
    room_number?: string;
    is_draft?: boolean;
}

export interface TimetablePeriod {
    period_number: number;
    start_time: string;
    end_time: string;
    is_break: boolean;
    label?: string;
}

export interface TimetableConfig {
    id?: string;
    institution_id: string;
    days: string[];
    periods: TimetablePeriod[];
    max_teacher_periods_per_day: number;
    max_teacher_periods_per_week: number;
    settings?: {
        allow_double_periods?: boolean;
        default_lesson_duration_minutes?: number;
    };
}

export interface ReadinessCheckItem {
    key: string;
    title: string;
    passed: boolean;
    details: string;
}

export interface TimetableReadinessResponse {
    ready: boolean;
    checks: ReadinessCheckItem[];
    unmet_prerequisites: string[];
}

export interface GenerateTimetableDto {
    save_as_draft?: boolean;
    target_class_ids?: string[] | null;
    replace_active?: boolean;
}

export interface GenerateTimetableResponse {
    success: boolean;
    message?: string;
    total_scheduled?: number;
    solver_engine?: string;
    entries?: TimetableEntry[];
    status?: string;
    diagnostics?: string[];
    error?: string;
}

export interface PublishTimetableResponse {
    message: string;
    published_count: number;
    affected_classes: number;
}

export interface ConflictCheckDto {
    class_id: string;
    subject_id?: string;
    teacher_id?: string;
    track_id?: string | null;
    day_of_week: string;
    start_time: string;
    end_time: string;
    exclude_id?: string;
}

export interface ConflictCheckResponse {
    has_conflict: boolean;
    conflicts: string[];
}

export const TimetableAPI = {
    // Admin: Create entry
    createEntry: async (data: CreateTimetableDto): Promise<TimetableEntry> => {
        try {
            const response = await api.post("/timetable", data);
            return response.data?.entry || response.data;
        } catch (error) {
            console.error("Create timetable error", error);
            throw error;
        }
    },

    // Get Class Timetable
    getClassTimetable: async (classId: string, includeDrafts: boolean = true): Promise<TimetableEntry[]> => {
        try {
            const response = await api.get(`/timetable/class/${classId}${includeDrafts ? '?include_drafts=true' : ''}`);
            return response.data;
        } catch (error) {
            console.error("Get class timetable error", error);
            throw error;
        }
    },

    // Get Teacher Timetable
    getTeacherTimetable: async (teacherId?: string): Promise<TimetableEntry[]> => {
        try {
            const url = teacherId ? `/timetable/teacher/${teacherId}` : `/timetable/teacher`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error("Get teacher timetable error", error);
            throw error;
        }
    },

    // Update Entry
    updateEntry: async (id: string, data: Partial<CreateTimetableDto>): Promise<TimetableEntry> => {
        try {
            const response = await api.put(`/timetable/${id}`, data);
            return response.data?.entry || response.data;
        } catch (error) {
            console.error("Update timetable error", error);
            throw error;
        }
    },

    // Delete Entry
    deleteEntry: async (id: string): Promise<void> => {
        try {
            await api.delete(`/timetable/${id}`);
        } catch (error) {
            console.error("Delete timetable error", error);
            throw error;
        }
    },

    // Live Conflict Detection for Manual Builder
    checkConflict: async (data: ConflictCheckDto): Promise<ConflictCheckResponse> => {
        try {
            const response = await api.post("/timetable/check-conflict", data);
            return response.data;
        } catch (error) {
            console.error("Check conflict error", error);
            throw error;
        }
    },

    // Configuration Management
    getConfig: async (): Promise<TimetableConfig> => {
        try {
            const response = await api.get("/timetable/config");
            return response.data;
        } catch (error) {
            console.error("Get timetable config error", error);
            throw error;
        }
    },

    saveConfig: async (config: Partial<TimetableConfig>): Promise<{ message: string; config: TimetableConfig }> => {
        try {
            const response = await api.put("/timetable/config", config);
            return response.data;
        } catch (error) {
            console.error("Save timetable config error", error);
            throw error;
        }
    },

    // Readiness Verification Checklist
    getReadiness: async (): Promise<TimetableReadinessResponse> => {
        try {
            const response = await api.get("/timetable/readiness");
            return response.data;
        } catch (error) {
            console.error("Get timetable readiness error", error);
            throw error;
        }
    },

    // Automatic Generation
    generateTimetable: async (payload: GenerateTimetableDto = {}): Promise<GenerateTimetableResponse> => {
        try {
            const response = await api.post("/timetable/generate", payload);
            return response.data;
        } catch (error: any) {
            if (error.response?.data) {
                return error.response.data;
            }
            throw error;
        }
    },

    // Publish Drafts
    publishTimetable: async (classIds?: string[] | null): Promise<PublishTimetableResponse> => {
        try {
            const response = await api.post("/timetable/publish", { class_ids: classIds });
            return response.data;
        } catch (error) {
            console.error("Publish timetable error", error);
            throw error;
        }
    }
};
