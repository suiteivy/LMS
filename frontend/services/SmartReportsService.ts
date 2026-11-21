import api from './api';

export interface ReportDataset {
  code: string;
  label: string;
  description: string;
  tableName: string;
  grain: string;
  owningSections: string[];
  requiredPermissions: string[];
  sensitivityLevel: 'standard' | 'sensitive' | 'restricted';
  historyBehavior: string;
}

export interface ReportField {
  datasetCode: string;
  fieldName: string;
  label: string;
  columnName: string;
  dataType: 'text' | 'number' | 'money' | 'date' | 'boolean' | 'enum';
  allowedOperators: string[];
  isFilterable: boolean;
  isSortable: boolean;
  isGroupable: boolean;
  isAggregatable: boolean;
  isSelectable: boolean;
  sensitivityLevel: string;
  displayFormat?: string;
  metricDefinition?: string;
}

export interface ReportPreset {
  code: string;
  title: string;
  description: string;
  contextSection: string;
  querySpec: any;
}

export interface CatalogResponse {
  success: boolean;
  sectionContext: string;
  datasets: ReportDataset[];
  fields: ReportField[];
  presets: ReportPreset[];
  canExport: boolean;
  canSchedule: boolean;
}

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'neq' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';
  value: any;
}

export interface QueryPeriod {
  type: 'active' | 'single' | 'multi' | 'range' | 'all';
  year?: string;
  years?: string[];
  startYear?: string;
  endYear?: string;
  term?: string;
  asOf?: string;
}

export interface QuerySpec {
  dataset: string;
  title?: string;
  columns: string[];
  filters?: QueryFilter[];
  period?: QueryPeriod;
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  ranking?: { topN: number; groupBy?: string; tieHandling?: 'shared_rank' | 'dense_rank' | 'break_by_field' };
  logicModifier?: string;
  limit?: number;
  offset?: number;
}

export interface PreviewResponse {
  success: boolean;
  totalCount: number;
  rows: any[];
  columns: string[];
  snapshotTimestamp: string;
  filterSummary: string;
  specHash: string;
}

export interface GeneratePdfResponse {
  success: boolean;
  fileName: string;
  fileSize: number;
  base64Pdf: string;
  snapshotTimestamp: string;
  totalCount: number;
  filterSummary: string;
}

export interface DossierResponse {
  success: boolean;
  personName: string;
  fileName: string;
  fileSize: number;
  base64Pdf: string;
  permittedSections: string[];
  excludedSections: Array<{ section: string; reason: string }>;
}

export interface RetentionPolicy {
  id?: string;
  institution_id?: string | null;
  data_class: string;
  retention_years: number;
  action_on_expiry: 'archive' | 'anonymize' | 'delete';
  legal_basis: string;
}

export interface LegalHold {
  id: string;
  institution_id?: string;
  title: string;
  target_entity_type: string;
  target_entity_id?: string;
  reason: string;
  placed_by: string;
  is_active: boolean;
  created_at: string;
}

export interface RestoreRequest {
  id: string;
  institution_id: string;
  requested_by: string;
  data_class: string;
  target_period: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  restored_until?: string;
}

class SmartReportsService {
  /**
   * Fetches the allowed data catalog for the active section and user role
   */
  async getCatalog(section: string = 'management'): Promise<CatalogResponse> {
    const res = await api.get<CatalogResponse>(`/api/reports/smart/catalog?section=${encodeURIComponent(section)}`);
    return res.data;
  }

  /**
   * Fast preview query returning count + sample rows + stable snapshot timestamp
   */
  async previewReport(spec: QuerySpec, sectionContext: string = 'management'): Promise<PreviewResponse> {
    const res = await api.post<PreviewResponse>('/api/reports/smart/preview', {
      spec,
      sectionContext,
    });
    return res.data;
  }

  /**
   * Generates vector PDF for custom report
   */
  async generateReport(spec: QuerySpec, sectionContext: string = 'management'): Promise<GeneratePdfResponse> {
    const res = await api.post<GeneratePdfResponse>('/api/reports/smart/generate', {
      spec,
      sectionContext,
    });
    return res.data;
  }

  /**
   * Compiles cumulative records dossier for student/staff/parent
   */
  async generateDossier(payload: {
    targetPersonType: 'student' | 'staff' | 'parent';
    targetPersonId: string;
    periodSpec?: QueryPeriod;
    includedSections?: string[];
    justificationReason: string;
  }): Promise<DossierResponse> {
    const res = await api.post<DossierResponse>('/api/reports/smart/dossier', payload);
    return res.data;
  }

  /**
   * Saved Reports
   */
  async getSavedReports(section?: string): Promise<any[]> {
    const url = section ? `/api/reports/smart/saved?section=${encodeURIComponent(section)}` : '/api/reports/smart/saved';
    const res = await api.get<{ success: boolean; data: any[] }>(url);
    return res.data.data || [];
  }

  async createSavedReport(payload: {
    title: string;
    description?: string;
    context_section: string;
    query_spec: QuerySpec;
    is_shared?: boolean;
    shared_with_roles?: string[];
  }): Promise<any> {
    const res = await api.post('/api/reports/smart/saved', payload);
    return res.data.data;
  }

  async deleteSavedReport(id: string): Promise<void> {
    await api.delete(`/api/reports/smart/saved/${id}`);
  }

  /**
   * Master Admin: Retention & Compliance
   */
  async getRetentionPolicies(institutionId?: string): Promise<RetentionPolicy[]> {
    const url = institutionId ? `/api/master-admin/retention/policies?institution_id=${encodeURIComponent(institutionId)}` : '/api/master-admin/retention/policies';
    const res = await api.get<{ success: boolean; policies: RetentionPolicy[] }>(url);
    return res.data.policies || [];
  }

  async updateRetentionPolicy(payload: RetentionPolicy): Promise<RetentionPolicy> {
    const res = await api.put<{ success: boolean; policy: RetentionPolicy }>('/api/master-admin/retention/policies', payload);
    return res.data.policy;
  }

  async getLegalHolds(institutionId?: string): Promise<LegalHold[]> {
    const url = institutionId ? `/api/master-admin/retention/legal-holds?institution_id=${encodeURIComponent(institutionId)}` : '/api/master-admin/retention/legal-holds';
    const res = await api.get<{ success: boolean; legal_holds: LegalHold[] }>(url);
    return res.data.legal_holds || [];
  }

  async createLegalHold(payload: {
    institution_id?: string;
    title: string;
    target_entity_type: string;
    target_entity_id?: string;
    reason: string;
  }): Promise<LegalHold> {
    const res = await api.post<{ success: boolean; legal_hold: LegalHold }>('/api/master-admin/retention/legal-holds', payload);
    return res.data.legal_hold;
  }

  async releaseLegalHold(id: string): Promise<void> {
    await api.put(`/api/master-admin/retention/legal-holds/${id}/release`);
  }

  async getRestoreRequests(): Promise<RestoreRequest[]> {
    const res = await api.get<{ success: boolean; restore_requests: RestoreRequest[] }>('/api/master-admin/retention/restore-requests');
    return res.data.restore_requests || [];
  }

  async handleRestoreRequest(id: string, action: 'approve' | 'reject'): Promise<void> {
    await api.post(`/api/master-admin/retention/restore-requests/${id}/action`, { action });
  }
}

export default new SmartReportsService();
