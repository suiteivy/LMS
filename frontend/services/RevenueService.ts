import { api } from './api';

export interface RevenueOverview {
  gross_revenue: number;
  total_deductions: number;
  net_revenue: number;
  payment_count: number;
  deduction_count: number;
  last_7_days: Array<{
    date: string;
    day: string;
    gross: number;
    deductions: number;
    net: number;
  }>;
}

export interface RevenueDeductionLog {
  id: string;
  amount: number;
  date: string;
  created_at: string;
  status: string;
  reason: string;
  target: string;
  recorded_by: string;
  origin_type?: string | null;
  origin_id?: string | null;
  origin_label?: string | null;
  target_type?: string | null;
  target_id?: string | null;
  target_label?: string | null;
  recorded_by_user_id?: string | null;
  recorded_by_label?: string | null;
  retention_until?: string | null;
}

export class RevenueService {
  static async getOverview(): Promise<RevenueOverview> {
    const response = await api.get('/finance/revenue/overview');
    return response.data;
  }

  static async getDeductions(search?: string): Promise<RevenueDeductionLog[]> {
    const response = await api.get('/finance/revenue/deductions', {
      params: search ? { search } : undefined,
    });
    return response.data || [];
  }

  static async recordUsage(payload: { amount: number; reason: string; target: string }): Promise<RevenueDeductionLog> {
    const response = await api.post('/finance/revenue/deductions', payload);
    return response.data;
  }
}
