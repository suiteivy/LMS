import { api } from './api';

export interface ExchangeRates {
    KES: number;
    last_updated: string | null;
}

export interface UserPreferences {
    push_notifications: boolean;
    submission_alerts: boolean;
    system_alerts: boolean;
    email_notifications: boolean;
    subscription_alerts?: boolean;
    issues_requests_alerts?: boolean;
    support_cases_alerts?: boolean;
}

export interface MaintenanceStatus {
    enabled: boolean;
    message: string;
    updated_at?: string | null;
}

export const SettingsService = {
    getCurrencyRates: async (): Promise<ExchangeRates> => {
        try {
            const response = await api.get('/settings/currency', { skipErrorToast: true });
            return response.data;
        } catch (error) {
            const e: any = error;
            if (e?.response?.status !== 401 && e?.code !== 'ERR_NETWORK') {
                console.error('Error fetching currency rates:', error);
            }
            // Fallback to default
            return { KES: 130.0, last_updated: null };
        }
    },

    getMaintenanceStatus: async (): Promise<MaintenanceStatus> => {
        const response = await api.get('/settings/maintenance', { skipErrorToast: true });
        return response.data;
    },

    getMasterMaintenanceMode: async (): Promise<MaintenanceStatus> => {
        const response = await api.get('/master-admin/maintenance-mode');
        return response.data;
    },

    updateMasterMaintenanceMode: async (
        enabled: boolean,
        message?: string,
    ): Promise<{ message: string; maintenance: MaintenanceStatus }> => {
        const response = await api.put('/master-admin/maintenance-mode', { enabled, message });
        return response.data;
    },

    updateCurrencyRates: async (): Promise<ExchangeRates> => {
        const response = await api.post('/settings/currency/update');
        return response.data;
    },

    // User notification preferences
    getPreferences: async (): Promise<UserPreferences> => {
        try {
            const response = await api.get('/settings/preferences');
            return response.data;
        } catch (error) {
            console.error('Error fetching preferences:', error);
            return {
                push_notifications: true,
                submission_alerts: true,
                system_alerts: true,
                email_notifications: true,
                subscription_alerts: true,
                issues_requests_alerts: true,
                support_cases_alerts: true,
            };
        }
    },

    updatePreferences: async (prefs: Partial<UserPreferences>): Promise<UserPreferences> => {
        const response = await api.put('/settings/preferences', prefs);
        return response.data?.preferences || response.data;
    },

    // Password management
    changePassword: async (current_password: string, new_password: string): Promise<{ message: string }> => {
        const response = await api.put('/auth/change-password', { current_password, new_password });
        return response.data;
    },

    adminResetPassword: async (targetUserId: string, newPassword: string): Promise<{ message: string }> => {
        const response = await api.post('/auth/admin-reset-password', { targetUserId, newPassword });
        return response.data;
    },

    adminRemove: async (targetUserId: string): Promise<{ message: string }> => {
        const response = await api.delete(`/master-admin/institutions/admins/${targetUserId}`);
        return response.data;
    },

    forgotPassword: async (email: string): Promise<{ message: string; is_hierarchical?: boolean }> => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    checkForgotPasswordEmail: async (email: string): Promise<{ exists: boolean; email: string; can_request_reset: boolean; message: string }> => {
        const response = await api.get('/auth/forgot-password/check-email', {
            params: { email },
            skipErrorToast: true,
        });
        return response.data;
    },

    setupSecurityQuestions: async (
        selected_question_key: string,
        selected_question_answer: string,
    ): Promise<{ message: string; selected_question_key: string; selected_question_prompt: string }> => {
        const response = await api.post('/auth/security-questions/setup', {
            selected_question_key,
            selected_question_answer,
        });
        return response.data;
    },

    verifySecurityQuestions: async (
        email: string,
        selected_question_answer?: string,
        new_password?: string,
    ): Promise<{
        verified: boolean;
        message: string;
        requires_answer?: boolean;
        selected_question_key?: string;
        selected_question_prompt?: string;
        attempts_remaining?: number;
    }> => {
        const response = await api.post('/auth/verify-security-questions', {
            email,
            selected_question_answer,
            new_password,
        });
        return response.data;
    },

    getCredentialDelivery: async (token: string): Promise<{ email: string; temporary_password: string; consumed: boolean }> => {
        const response = await api.get(`/auth/credential-delivery/${encodeURIComponent(token)}`, { skipErrorToast: true });
        return response.data;
    },
};
