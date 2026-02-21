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
}

export const SettingsService = {
    getCurrencyRates: async (): Promise<ExchangeRates> => {
        try {
            const response = await api.get('/settings/currency', { skipErrorToast: true });
            return response.data;
        } catch (error) {
            console.error('Error fetching currency rates:', error);
            // Fallback to default
            return { KES: 130.0, last_updated: null };
        }
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

    forgotPassword: async (email: string): Promise<{ message: string }> => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },
};
