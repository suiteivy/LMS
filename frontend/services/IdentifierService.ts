import { api } from './api';

export interface LegacyIdentifierRecord {
  person_id: string;
  person_type: 'student' | 'staff' | 'parent';
  old_identifier: string;
  new_identifier: string;
  migrated_at: string;
}

export interface ResolvedPersonResult {
  person_id: string;
  person_type: 'student' | 'staff' | 'parent';
  active_number: string;
  is_legacy: boolean;
}

export interface InstitutionMigrationStatus {
  institution_id: string;
  institution_name: string;
  students_migrated: number;
  staff_migrated: number;
  parents_migrated: number;
  crosswalk_entries: number;
  status: string;
}

export const IdentifierService = {
  /**
   * Search and resolve an identifier (whether new 0001/ST0001/PA0001 or old legacy format).
   */
  resolveIdentifier: async (identifier: string): Promise<ResolvedPersonResult | null> => {
    try {
      const response = await api.get(`/identifiers/resolve?identifier=${encodeURIComponent(identifier.trim())}`);
      return response.data?.person || null;
    } catch {
      return null;
    }
  },

  /**
   * Get all crosswalk mappings for the institution (Main Admin download & review).
   */
  getCrosswalkReport: async (): Promise<LegacyIdentifierRecord[]> => {
    try {
      const response = await api.get('/identifiers/crosswalk');
      return response.data?.records || [];
    } catch (err) {
      console.error('Failed to get crosswalk report:', err);
      return [];
    }
  },

  /**
   * Get migration status overview across institutions (Master Admin & Admin).
   */
  getMigrationStatus: async (institutionId?: string): Promise<InstitutionMigrationStatus[] | InstitutionMigrationStatus | null> => {
    try {
      const url = institutionId ? `/identifiers/migration-status?institution_id=${institutionId}` : '/identifiers/migration-status';
      const response = await api.get(url);
      return response.data?.data || null;
    } catch (err) {
      console.error('Failed to get migration status:', err);
      return null;
    }
  },
};
