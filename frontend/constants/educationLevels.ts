export interface EducationLevelOption {
    value: number;
    label: string;
    code: string;
    category: 'early_years' | 'primary' | 'junior_secondary' | 'senior_secondary';
    education_level: 'playgroup' | 'pre_primary' | 'primary' | 'junior_secondary' | 'senior_secondary';
}

export const EDUCATION_LEVELS: EducationLevelOption[] = [
    { value: -2, label: 'Playgroup', code: 'PLAYGROUP', category: 'early_years', education_level: 'playgroup' },
    { value: -1, label: 'PP1', code: 'PP1', category: 'early_years', education_level: 'pre_primary' },
    { value: 0,  label: 'PP2', code: 'PP2', category: 'early_years', education_level: 'pre_primary' },
    { value: 1,  label: 'Grade 1', code: 'GRADE_1', category: 'primary', education_level: 'primary' },
    { value: 2,  label: 'Grade 2', code: 'GRADE_2', category: 'primary', education_level: 'primary' },
    { value: 3,  label: 'Grade 3', code: 'GRADE_3', category: 'primary', education_level: 'primary' },
    { value: 4,  label: 'Grade 4', code: 'GRADE_4', category: 'primary', education_level: 'primary' },
    { value: 5,  label: 'Grade 5', code: 'GRADE_5', category: 'primary', education_level: 'primary' },
    { value: 6,  label: 'Grade 6', code: 'GRADE_6', category: 'primary', education_level: 'primary' },
    { value: 7,  label: 'Grade 7', code: 'GRADE_7', category: 'junior_secondary', education_level: 'junior_secondary' },
    { value: 8,  label: 'Grade 8', code: 'GRADE_8', category: 'junior_secondary', education_level: 'junior_secondary' },
    { value: 9,  label: 'Grade 9', code: 'GRADE_9', category: 'junior_secondary', education_level: 'junior_secondary' },
    { value: 10, label: 'Grade 10', code: 'GRADE_10', category: 'senior_secondary', education_level: 'senior_secondary' },
    { value: 11, label: 'Grade 11', code: 'GRADE_11', category: 'senior_secondary', education_level: 'senior_secondary' },
    { value: 12, label: 'Grade 12', code: 'GRADE_12', category: 'senior_secondary', education_level: 'senior_secondary' },
];

/**
 * Format a numeric or string grade/level to human-readable label.
 * Maps -2 -> Playgroup, -1 -> PP1, 0 -> PP2, 1..12 -> Grade 1..12.
 */
export function getLevelDisplayName(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (num === -2 || String(value).toLowerCase() === 'playgroup') return 'Playgroup';
    if (num === -1 || String(value).toLowerCase() === 'pp1') return 'PP1';
    if (num === 0  || String(value).toLowerCase() === 'pp2') return 'PP2';
    if (Number.isFinite(num) && num > 0) return `Grade ${num}`;
    return String(value);
}

/**
 * Resolves standard CBC education_level band from numeric level.
 */
export function getEducationLevelCategory(value: number | string | null | undefined): string {
    const num = Number(value);
    if (num === -2) return 'playgroup';
    if (num === -1 || num === 0) return 'pre_primary';
    if (num >= 1 && num <= 6) return 'primary';
    if (num >= 7 && num <= 9) return 'junior_secondary';
    if (num >= 10 && num <= 12) return 'senior_secondary';
    return 'primary';
}
