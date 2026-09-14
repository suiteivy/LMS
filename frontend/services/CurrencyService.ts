import { api } from './api';

export interface CurrencyRecord {
  id: string;
  code: string;
  name: string;
  symbol: string;
  usd_rate: number;
  decimal_places: number;
  is_default: boolean;
  is_active: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export const CurrencyService = {
  getPublicCurrencies: async (): Promise<CurrencyRecord[]> => {
    try {
      const response = await api.get('/settings/currencies', { skipErrorToast: true });
      return response.data?.currencies || [];
    } catch (error) {
      // Fallback silently if public rates cannot be fetched (e.g. offline, auth warming up)
      return [];
    }
  },

  getMasterCurrencies: async (): Promise<CurrencyRecord[]> => {
    const response = await api.get('/master-admin/currencies');
    return response.data?.currencies || [];
  },

  upsertCurrency: async (
    payload: Partial<CurrencyRecord> & { code: string; name: string; symbol: string; usd_rate: number },
  ): Promise<CurrencyRecord> => {
    if (payload.id) {
      const response = await api.put(`/master-admin/currencies/${payload.id}`, payload);
      return response.data?.currency;
    }

    const response = await api.post('/master-admin/currencies', payload);
    return response.data?.currency;
  },

  deactivateCurrency: async (id: string): Promise<void> => {
    await api.delete(`/master-admin/currencies/${id}`);
  },
};
