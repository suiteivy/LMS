export interface EducationLevelOption {
    value: number;
    label: string;
    code: string;
    category: 'early_years' | 'primary' | 'junior_secondary' | 'senior_secondary';
    education_level: 'playgroup' | 'pre_primary' | 'primary' | 'junior_secondary' | 'senior_secondary';
}

export const EARLY_YEARS_PRESETS = [
    { levelNumber: -2, name: 'Playgroup', shortCode: 'PG', category: 'early_years' as const, education_level: 'playgroup' as const },
    { levelNumber: -1, name: 'PP1', shortCode: 'PP1', category: 'early_years' as const, education_level: 'pre_primary' as const },
    { levelNumber: 0,  name: 'PP2', shortCode: 'PP2', category: 'early_years' as const, education_level: 'pre_primary' as const },
] as const;

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
 * Also sanitizes legacy/buggy labels like "Grade -2", "Grade -1", "Grade 0".
 */
export function getLevelDisplayName(value: number | string | null | undefined, defaultClassType: string = 'Grade'): string {
    if (value === null || value === undefined || value === '') return '';

    const str = String(value).trim();
    const strLower = str.toLowerCase();

    // Check for early years keywords
    if (strLower === 'playgroup' || strLower === 'pg' || strLower === 'play group' || /^grade\s*-2$/i.test(str)) return 'Playgroup';
    if (strLower === 'pp1' || strLower === 'pre-primary 1' || strLower === 'pre primary 1' || /^grade\s*-1$/i.test(str)) return 'PP1';
    if (strLower === 'pp2' || strLower === 'pre-primary 2' || strLower === 'pre primary 2' || /^grade\s*0$/i.test(str)) return 'PP2';

    const num = Number(value);
    if (Number.isFinite(num)) {
        if (num === -2) return 'Playgroup';
        if (num === -1) return 'PP1';
        if (num === 0) return 'PP2';
        if (num > 0) return `${defaultClassType} ${num}`;
    }

    return str;
}

/**
 * Get short badge code for compact displays (e.g. 'PG', 'PP1', 'PP2', '1'..'12').
 */
export function getLevelShortCode(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const str = String(value).trim();
    const strLower = str.toLowerCase();

    if (strLower === 'playgroup' || strLower === 'pg' || strLower === 'play group' || str === '-2' || /^grade\s*-2$/i.test(str)) return 'PG';
    if (strLower === 'pp1' || strLower === 'pre-primary 1' || strLower === 'pre primary 1' || str === '-1' || /^grade\s*-1$/i.test(str)) return 'PP1';
    if (strLower === 'pp2' || strLower === 'pre-primary 2' || strLower === 'pre primary 2' || str === '0' || /^grade\s*0$/i.test(str)) return 'PP2';

    const num = Number(value);
    if (Number.isFinite(num)) {
        if (num === -2) return 'PG';
        if (num === -1) return 'PP1';
        if (num === 0) return 'PP2';
        return String(num);
    }

    return str;
}

/**
 * Robust parsing of a grade level string or number to its integer level representation.
 * Playgroup -> -2, PP1 -> -1, PP2 -> 0, Grade 1..12 -> 1..12.
 * Avoids naive regex that matches '1' inside 'PP1' or '2' inside 'PP2'.
 */
export function parseLevelValue(value: number | string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;

    // Direct number
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.round(value);
    }

    const str = String(value).trim();
    const strLower = str.toLowerCase();

    // Check Early Years keywords FIRST before any digit extraction
    if (strLower === 'playgroup' || strLower === 'pg' || strLower === 'play group' || /^grade\s*-2$/i.test(str)) return -2;
    if (strLower === 'pp1' || strLower === 'pre-primary 1' || strLower === 'pre primary 1' || /^grade\s*-1$/i.test(str)) return -1;
    if (strLower === 'pp2' || strLower === 'pre-primary 2' || strLower === 'pre primary 2' || /^grade\s*0$/i.test(str)) return 0;

    // Check signed direct numbers like "-2", "-1", "0"
    if (/^-?\d+$/.test(str)) {
        return parseInt(str, 10);
    }

    // Extract digits from "Grade 3", "Form 2", etc.
    const match = str.match(/\d+/);
    if (match) {
        return parseInt(match[0], 10);
    }

    return undefined;
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
