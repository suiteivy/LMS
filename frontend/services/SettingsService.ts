import { api } from './api';

export interface ExchangeRates {
    KES: number;
    last_updated: string | null;
}

export const SettingsService = {
    getCurrencyRates: async (): Promise<ExchangeRates> => {
        try {
            const response = await api.get('/settings/currency');
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
    }
};
