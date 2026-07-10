const supabase = require("../utils/supabaseClient.js");
const { buildClassLabel } = require('../utils/classLabel');
const { assignStudentToSingleClass } = require('../utils/studentClassEnrollment');

function toFiniteNumber(value) {
    if (value === null || value === undefined || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function normalizeStream(value) {
    if (value === null || value === undefined) return undefined;
    const s = String(value).trim();
    return s || undefined;
}

function deriveStreamFromName(name, classType, gradeLevel, formLevel) {
    const raw = normalizeStream(name);
    if (!raw) return undefined;

    let stream = raw;
    const typeLabel = String(classType || 'Grade').trim() || 'Grade';
    const levelValue = typeLabel === 'Form'
        ? formLevel
        : gradeLevel;

    if (levelValue !== undefined && levelValue !== null) {
        const escapedLevel = String(levelValue).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedLabel = String(typeLabel || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const prefix = new RegExp(`^${escapedLabel}\\s*${escapedLevel}\\s*`, 'i');
        stream = stream.replace(prefix, '').trim();

        const numericPrefix = new RegExp(`^${escapedLevel}\\s*[-_]?\\s*`, 'i');
        stream = stream.replace(numericPrefix, '').trim();
    }

    if (!stream || /^grade\s+\d+$/i.test(stream) || /^form\s+\d+$/i.test(stream) || /^kg\s+\d+$/i.test(stream)) {
        return undefined;
    }

    return stream;
}

async function getInstitutionCategoryMeta(institutionId) {
    if (!institutionId) {
        return {
            institution_name: null,
            school_category_name: null,
            class_type: 'Grade',
            class_types: ['Grade'],
            class_types_by_level_id: {},
        };
    }

    const [{ data: institution }, { data: categoryRows, error: categoryError }] = await Promise.all([
        supabase
            .from('institutions')
            .select('name')
            .eq('id', institutionId)
            .single(),
        supabase
            .from('institution_categories')
            .select('school_categories:category_id(id, name, school_category_types(type_id, category_types:type_id(name, sort_order)))')
            .eq('institution_id', institutionId),
    ]);

    const typePairs = [];
    if (!categoryError && Array.isArray(categoryRows)) {
        for (const row of categoryRows) {
            const category = row?.school_categories;
            const links = category?.school_category_types || [];
            if (Array.isArray(links) && links.length > 0) {
                for (const link of links) {
                    const typeName = link?.category_types?.name;
                    if (typeName) {
                        typePairs.push({
                            name: String(typeName).trim(),
                            sort_order: Number(link?.category_types?.sort_order) || 100,
                        });
                    }
                }
            }
        }
    }

    typePairs.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
    const classTypes = [...new Set(typePairs.map((pair) => pair.name).filter(Boolean))];
    const primaryType = classTypes[0] || 'Grade';

    return {
        institution_name: institution?.name || null,
        school_category_name: null,
        class_type: primaryType,
        class_types: classTypes.length > 0 ? classTypes : ['Grade'],
        class_types_by_level_id: {},
    };
}

function normalizeClassRecord(record, meta) {
    if (!record) return null;
    const withMeta = {
        ...record,
        institution_name: record.institution_name || meta?.institution_name || null,
        school_category_name: record.school_category_name || meta?.school_category_name || null,
        class_type: record.class_type || meta?.class_type || 'Grade',
    };
    return {
        ...withMeta,
        name: withMeta.display_name || buildClassLabel(withMeta) || withMeta.id,
    };
}

function hasRelationMissingError(error) {
    const message = String(error?.message || '').toLowerCase();
    const details = String(error?.details || '').toLowerCase();
    const code = String(error?.code || '').toLowerCase();
    return (
        message.includes('does not exist') ||
        message.includes('not found') ||
        details.includes('does not exist') ||
        code === '42p01' ||
        code === '42703'
    );
}

function buildDefaultLevelRange(levelLabel) {
    if (levelLabel === 'Form') return [1, 2, 3, 4, 5, 6];
    if (levelLabel === 'KG') return [1, 2, 3];
    return [1, 2, 3, 4, 5, 6, 7];
}

let classesDeletedAtSupportPromise = null;
async function supportsClassesDeletedAt() {
    if (!classesDeletedAtSupportPromise) {
        classesDeletedAtSupportPromise = (async () => {
            const { error } = await supabase
                .from('classes')
                .select('deleted_at')
                .limit(1);

            if (!error) return true;

            const message = String(error?.message || '').toLowerCase();
            const details = String(error?.details || '').toLowerCase();
            const code = String(error?.code || '').toLowerCase();
            if (
                message.includes('deleted_at') ||
                details.includes('deleted_at') ||
                code === '42703'
            ) {
                return false;
            }

            throw error;
        })();
    }

    return classesDeletedAtSupportPromise;
}

let classDomainSupportPromise = null;
async function supportsClassDomainTables() {
    if (!classDomainSupportPromise) {
        classDomainSupportPromise = (async () => {
            const { error } = await supabase
                .from('class_categories')
                .select('id')
                .limit(1);

            if (!error) return true;
            if (hasRelationMissingError(error)) return false;
            throw error;
        })();
    }

    return classDomainSupportPromise;
}

let classesClassTypeSupportPromise = null;
async function supportsClassesClassType() {
    if (!classesClassTypeSupportPromise) {
        classesClassTypeSupportPromise = (async () => {
            const { error } = await supabase
                .from('classes')
                .select('class_type')
                .limit(1);

            if (!error) return true;

            const message = String(error?.message || '').toLowerCase();
            const details = String(error?.details || '').toLowerCase();
            const code = String(error?.code || '').toLowerCase();
            if (
                message.includes('class_type') ||
                details.includes('class_type') ||
                code === '42703'
            ) {
                return false;
            }

            throw error;
        })();
    }

    return classesClassTypeSupportPromise;
}

async function getClassDomainOptions(institutionId) {
    const { data: scopedInstitutionCategories } = await supabase
        .from('institution_categories')
        .select('category_id')
        .eq('institution_id', institutionId);

    const scopedCategoryIds = [...new Set((scopedInstitutionCategories || []).map((row) => row.category_id).filter(Boolean))];

    let categoriesQuery = supabase
        .from('class_categories')
        .select('id, name, description, sort_order, school_category_id')
        .eq('institution_id', institutionId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

    if (scopedCategoryIds.length > 0) {
        categoriesQuery = categoriesQuery.in('school_category_id', scopedCategoryIds);
    }

    const [categoriesRes, levelsRes, streamsRes] = await Promise.all([
        categoriesQuery,
        supabase
            .from('class_levels')
            .select('id, category_id, level_number, name, sort_order, type_id, category_types:type_id(name, sort_order)')
            .eq('institution_id', institutionId)
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })
            .order('level_number', { ascending: true }),
        supabase
            .from('class_streams')
            .select('id, level_id, code, name, sort_order')
            .eq('institution_id', institutionId)
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })
            .order('code', { ascending: true }),
    ]);

    if (categoriesRes.error) throw categoriesRes.error;
    if (levelsRes.error) throw levelsRes.error;
    if (streamsRes.error) throw streamsRes.error;

    const categories = categoriesRes.data || [];
    const allowedCategoryIds = new Set(categories.map((item) => item.id));
    const levels = (levelsRes.data || []).filter((item) => allowedCategoryIds.has(item.category_id));
    const allowedLevelIds = new Set(levels.map((item) => item.id));
    const streams = (streamsRes.data || []).filter((item) => allowedLevelIds.has(item.level_id));

    return {
        categories,
        levels,
        streams,
    };
}

async function getClassTypesByLevelIds(levelIds = []) {
    const uniqueLevelIds = [...new Set((levelIds || []).filter(Boolean))];
    if (uniqueLevelIds.length === 0) return {};

    const { data, error } = await supabase
        .from('class_levels')
        .select('id, category_types:type_id(name)')
        .in('id', uniqueLevelIds)
        .is('deleted_at', null);

    if (error) {
        if (hasRelationMissingError(error)) {
            const { data: fallbackRows, error: fallbackError } = await supabase
                .from('class_levels')
                .select('id')
                .in('id', uniqueLevelIds)
                .is('deleted_at', null);

            if (fallbackError) return {};

            const fallbackMap = {};
            for (const row of fallbackRows || []) {
                fallbackMap[row.id] = 'Grade';
            }
            return fallbackMap;
        }
        throw error;
    }

    const map = {};
    for (const row of data || []) {
        map[row.id] = row?.category_types?.name || 'Grade';
    }
    return map;
}

async function resolveLegacyLevelAndStreamForClass({ institutionId, categoryId, levelId, streamId }) {
    let normalizedCategoryId = categoryId || null;
    let normalizedLevelId = levelId || null;
    let normalizedStreamId = streamId || null;
    let gradeLevel = null;
    let formLevel = null;
    let streamCode = null;
    let classType = 'Grade';

    if (!normalizedLevelId && normalizedStreamId) {
        const { data: streamRow, error: streamError } = await supabase
            .from('class_streams')
            .select('id, level_id, code')
            .eq('id', normalizedStreamId)
            .eq('institution_id', institutionId)
            .is('deleted_at', null)
            .single();
        if (streamError || !streamRow) throw new Error('Invalid stream_id');
        normalizedStreamId = streamRow.id;
        normalizedLevelId = streamRow.level_id;
        streamCode = streamRow.code;
    }

    if (normalizedLevelId) {
        const { data: levelRow, error: levelError } = await supabase
            .from('class_levels')
            .select('id, category_id, level_number, type_id, category_types:type_id(name)')
            .eq('id', normalizedLevelId)
            .eq('institution_id', institutionId)
            .is('deleted_at', null)
            .single();
        if (levelError || !levelRow) throw new Error('Invalid level_id');
        normalizedLevelId = levelRow.id;
        normalizedCategoryId = normalizedCategoryId || levelRow.category_id;
        classType = String(levelRow?.category_types?.name || classType).trim() || 'Grade';

        if (classType === 'Form') {
            formLevel = levelRow.level_number;
        } else {
            gradeLevel = levelRow.level_number;
        }
    }

    if (normalizedStreamId && !streamCode) {
        const { data: streamRow, error: streamError } = await supabase
            .from('class_streams')
            .select('id, level_id, code')
            .eq('id', normalizedStreamId)
            .eq('institution_id', institutionId)
            .is('deleted_at', null)
            .single();
        if (streamError || !streamRow) throw new Error('Invalid stream_id');
        if (normalizedLevelId && streamRow.level_id !== normalizedLevelId) {
            throw new Error('stream_id does not belong to level_id');
        }
        normalizedStreamId = streamRow.id;
        normalizedLevelId = normalizedLevelId || streamRow.level_id;
        streamCode = streamRow.code;
    }

    if (normalizedCategoryId) {
        const { data: categoryRow, error: categoryError } = await supabase
            .from('class_categories')
            .select('id')
            .eq('id', normalizedCategoryId)
            .eq('institution_id', institutionId)
            .is('deleted_at', null)
            .single();
        if (categoryError || !categoryRow) throw new Error('Invalid category_id');
    }

    return {
        category_id: normalizedCategoryId,
        level_id: normalizedLevelId,
        stream_id: normalizedStreamId,
        grade_level: gradeLevel,
        form_level: formLevel,
        stream: streamCode,
        class_type: classType,
    };
}

async function hasClassDomainReferences(classId) {
    const safeCount = async (table, column = 'class_id') => {
        const res = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq(column, classId);

        if (res.error) {
            if (hasRelationMissingError(res.error)) {
                return 0;
            }
            throw res.error;
        }

        return res.count || 0;
    };

    const [subjectsCount, timetableCount, enrollmentsCount] = await Promise.all([
        safeCount('subjects'),
        safeCount('timetables'),
        safeCount('class_enrollments'),
    ]);

    return {
        hasReferences: subjectsCount > 0 || timetableCount > 0 || enrollmentsCount > 0,
        subjects: subjectsCount,
        timetables: timetableCount,
        enrollments: enrollmentsCount,
    };
}

exports.getClassDomainCatalog = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        if (!institution_id) {
            return res.status(400).json({ error: 'Institution context is required' });
        }

        const supportsDomain = await supportsClassDomainTables();
        if (!supportsDomain) {
            return res.status(503).json({ error: 'Class domain tables are not available yet' });
        }

        const data = await getClassDomainOptions(institution_id);
        res.json(data);
    } catch (err) {
        console.error('getClassDomainCatalog error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createClassDomainCategory = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const { name, description, sort_order } = req.body;
        if (!institution_id) return res.status(400).json({ error: 'Institution context is required' });
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });

        const { data, error } = await supabase
            .from('class_categories')
            .insert({
                institution_id,
                name: String(name).trim(),
                description: description ? String(description).trim() : null,
                sort_order: toFiniteNumber(sort_order) ?? 0,
            })
            .select('id, name, description, sort_order')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createClassDomainCategory error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createClassDomainLevel = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const { category_id, level_number, name, sort_order } = req.body;
        if (!institution_id) return res.status(400).json({ error: 'Institution context is required' });
        if (!category_id) return res.status(400).json({ error: 'category_id is required' });
        const levelNumber = toFiniteNumber(level_number);
        if (!levelNumber || levelNumber <= 0) return res.status(400).json({ error: 'level_number must be a positive integer' });

        const { data: category, error: categoryError } = await supabase
            .from('class_categories')
            .select('id')
            .eq('id', category_id)
            .eq('institution_id', institution_id)
            .is('deleted_at', null)
            .single();
        if (categoryError || !category) return res.status(404).json({ error: 'Category not found' });

        const { data, error } = await supabase
            .from('class_levels')
            .insert({
                institution_id,
                category_id,
                level_number: levelNumber,
                name: name ? String(name).trim() : null,
                sort_order: toFiniteNumber(sort_order) ?? levelNumber,
            })
            .select('id, category_id, level_number, name, sort_order')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createClassDomainLevel error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createClassDomainStream = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const { level_id, code, name, sort_order } = req.body;
        if (!institution_id) return res.status(400).json({ error: 'Institution context is required' });
        if (!level_id) return res.status(400).json({ error: 'level_id is required' });
        if (!code || !String(code).trim()) return res.status(400).json({ error: 'code is required' });

        const { data: level, error: levelError } = await supabase
            .from('class_levels')
            .select('id')
            .eq('id', level_id)
            .eq('institution_id', institution_id)
            .is('deleted_at', null)
            .single();
        if (levelError || !level) return res.status(404).json({ error: 'Level not found' });

        const { data, error } = await supabase
            .from('class_streams')
            .insert({
                institution_id,
                level_id,
                code: String(code).trim(),
                name: name ? String(name).trim() : null,
                sort_order: toFiniteNumber(sort_order) ?? 0,
            })
            .select('id, level_id, code, name, sort_order')
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createClassDomainStream error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.archiveClassDomainCategory = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const { id } = req.params;
        if (!institution_id) return res.status(400).json({ error: 'Institution context is required' });

        const { data: levels, error: levelsError } = await supabase
            .from('class_levels')
            .select('id')
            .eq('institution_id', institution_id)
            .eq('category_id', id)
            .is('deleted_at', null);
        if (levelsError) throw levelsError;

        const levelIds = (levels || []).map((row) => row.id);
        if (levelIds.length > 0) {
            const { count: classCount, error: classCountError } = await supabase
                .from('classes')
                .select('id', { count: 'exact', head: true })
                .in('level_id', levelIds);
            if (classCountError && !hasRelationMissingError(classCountError)) throw classCountError;
            if ((classCount || 0) > 0) {
                return res.status(400).json({ error: 'Cannot archive category that is referenced by classes' });
            }
        }

        const { data, error } = await supabase
            .from('class_categories')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .is('deleted_at', null)
            .select('id')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category archived successfully' });
    } catch (err) {
        console.error('archiveClassDomainCategory error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.archiveClassDomainLevel = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const { id } = req.params;
        if (!institution_id) return res.status(400).json({ error: 'Institution context is required' });

        const { count: classCount, error: classCountError } = await supabase
            .from('classes')
            .select('id', { count: 'exact', head: true })
            .eq('level_id', id)
            .eq('institution_id', institution_id);
        if (classCountError && !hasRelationMissingError(classCountError)) throw classCountError;
        if ((classCount || 0) > 0) {
            return res.status(400).json({ error: 'Cannot archive level that is referenced by classes' });
        }

        const { data, error } = await supabase
            .from('class_levels')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .is('deleted_at', null)
            .select('id')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Level not found' });
        res.json({ message: 'Level archived successfully' });
    } catch (err) {
        console.error('archiveClassDomainLevel error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.archiveClassDomainStream = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const { id } = req.params;
        if (!institution_id) return res.status(400).json({ error: 'Institution context is required' });

        const { count: classCount, error: classCountError } = await supabase
            .from('classes')
            .select('id', { count: 'exact', head: true })
            .eq('stream_id', id)
            .eq('institution_id', institution_id);
        if (classCountError && !hasRelationMissingError(classCountError)) throw classCountError;
        if ((classCount || 0) > 0) {
            return res.status(400).json({ error: 'Cannot archive stream that is referenced by classes' });
        }

        const { data, error } = await supabase
            .from('class_streams')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)
            .eq('institution_id', institution_id)
            .is('deleted_at', null)
            .select('id')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Stream not found' });
        res.json({ message: 'Stream archived successfully' });
    } catch (err) {
        console.error('archiveClassDomainStream error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Create a new class
 */
exports.createClass = async (req, res) => {
    try {
        const { grade_level, form_level, stream, name, capacity, teacher_id, category_id, level_id, stream_id } = req.body;
        const institution_id = req.institution_id;
        const meta = await getInstitutionCategoryMeta(institution_id);
        const useDomain = await supportsClassDomainTables();
        const hasClassType = await supportsClassesClassType();

        const normalizedGradeLevel = toFiniteNumber(grade_level);
        const normalizedFormLevel = toFiniteNumber(form_level);
        const requestClassType = String(req.body?.class_type || '').trim() || meta.class_type;
        const derivedStream = normalizeStream(stream)
            || deriveStreamFromName(name, requestClassType, normalizedGradeLevel, normalizedFormLevel);

        const insertData = {
            institution_id: institution_id || null,
        };

        if (useDomain && (category_id || level_id || stream_id)) {
            const resolved = await resolveLegacyLevelAndStreamForClass({
                institutionId: institution_id,
                categoryId: category_id,
                levelId: level_id,
                streamId: stream_id,
            });

            insertData.category_id = resolved.category_id;
            insertData.level_id = resolved.level_id;
            insertData.stream_id = resolved.stream_id;
            if (resolved.grade_level !== null) insertData.grade_level = resolved.grade_level;
            if (resolved.form_level !== null) insertData.form_level = resolved.form_level;
            if (resolved.stream) insertData.stream = resolved.stream;
            if (hasClassType) insertData.class_type = resolved.class_type;
        } else {
            if (normalizedGradeLevel !== undefined) insertData.grade_level = normalizedGradeLevel;
            if (normalizedFormLevel !== undefined) insertData.form_level = normalizedFormLevel;
            if (derivedStream !== undefined) insertData.stream = derivedStream;
            if (hasClassType) insertData.class_type = requestClassType;
        }
        if (capacity !== undefined) insertData.capacity = capacity;
        if (teacher_id !== undefined) insertData.teacher_id = teacher_id;

        const { data, error } = await supabase
            .from("classes")
            .insert(insertData)
            .select("*")
            .single();

        if (error) throw error;
        res.status(201).json(normalizeClassRecord(data, meta));
    } catch (err) {
        console.error("createClass error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update a class
 */
exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { grade_level, form_level, stream, name, capacity, teacher_id, category_id, level_id, stream_id } = req.body;

        const { data: existingClass, error: existingClassError } = await supabase
            .from('classes')
            .select('id, institution_id, grade_level, form_level, category_id, level_id, stream_id')
            .eq('id', id)
            .single();

        if (existingClassError || !existingClass) {
            return res.status(404).json({ error: 'Class not found' });
        }

        const meta = await getInstitutionCategoryMeta(existingClass.institution_id);
        const useDomain = await supportsClassDomainTables();
        const hasClassType = await supportsClassesClassType();
        const normalizedGradeLevel = toFiniteNumber(grade_level);
        const normalizedFormLevel = toFiniteNumber(form_level);
        const requestClassType = String(req.body?.class_type || '').trim() || meta.class_type;

        const updates = {};

        if (useDomain && (category_id !== undefined || level_id !== undefined || stream_id !== undefined)) {
            const resolved = await resolveLegacyLevelAndStreamForClass({
                institutionId: existingClass.institution_id,
                categoryId: category_id !== undefined ? category_id : existingClass.category_id,
                levelId: level_id !== undefined ? level_id : existingClass.level_id,
                streamId: stream_id !== undefined ? stream_id : existingClass.stream_id,
            });

            updates.category_id = resolved.category_id;
            updates.level_id = resolved.level_id;
            updates.stream_id = resolved.stream_id;
            updates.grade_level = resolved.grade_level;
            updates.form_level = resolved.form_level;
            updates.stream = resolved.stream;
            if (hasClassType) updates.class_type = resolved.class_type;
        } else {
            if (grade_level !== undefined) updates.grade_level = normalizedGradeLevel ?? null;
            if (form_level !== undefined) updates.form_level = normalizedFormLevel ?? null;
            if (stream !== undefined) {
                updates.stream = normalizeStream(stream) || null;
            } else if (name !== undefined) {
                const fallbackGradeLevel = normalizedGradeLevel !== undefined
                    ? normalizedGradeLevel
                    : existingClass.grade_level;
                const fallbackFormLevel = normalizedFormLevel !== undefined
                    ? normalizedFormLevel
                    : existingClass.form_level;
                updates.stream = deriveStreamFromName(name, requestClassType, fallbackGradeLevel, fallbackFormLevel) || null;
            }
            if (hasClassType && (req.body?.class_type !== undefined || name !== undefined || grade_level !== undefined || form_level !== undefined)) {
                updates.class_type = requestClassType;
            }
        }
        if (capacity !== undefined) updates.capacity = capacity;
        if (teacher_id !== undefined) updates.teacher_id = teacher_id || null;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const { data, error } = await supabase
            .from("classes")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single();

        if (error) throw error;
        res.json(normalizeClassRecord(data, meta));
    } catch (err) {
        console.error("updateClass error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete a class (only if no students are enrolled)
 */
exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;
        const institution_id = req.institution_id;

        // Check for enrolled students
        const { count } = await supabase
            .from("class_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("class_id", id);

        if (count && count > 0) {
            return res.status(400).json({
                error: `Cannot delete class with ${count} enrolled students. Remove students first.`,
            });
        }

        const hasDeletedAt = await supportsClassesDeletedAt();

        // Hard delete mode can fail on FK dependencies (subjects, timetables, etc.).
        // Surface this early with a clear message.
        if (!hasDeletedAt) {
            const refs = await hasClassDomainReferences(id);
            if (refs.hasReferences) {
                return res.status(400).json({
                    error: `Cannot delete class because it is referenced by other records (subjects: ${refs.subjects}, timetables: ${refs.timetables}, enrollments: ${refs.enrollments}). Apply the classes deleted_at migration to enable archiving instead of hard delete.`,
                });
            }
        }

        let query = hasDeletedAt
            ? supabase
                .from("classes")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id)
                .is('deleted_at', null)
            : supabase
                .from('classes')
                .delete()
                .eq('id', id);

        if (institution_id) {
            query = query.eq('institution_id', institution_id);
        }

        const { data, error } = await query.select('id').single();
        if (error) {
            const message = String(error?.message || '').toLowerCase();
            if (!hasDeletedAt && (message.includes('foreign key') || message.includes('constraint'))) {
                return res.status(400).json({
                    error: 'Cannot delete class because it is referenced by other records. Apply the classes deleted_at migration to enable archiving instead.',
                });
            }
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: 'Class not found' });
        }

        res.json({ message: hasDeletedAt ? "Class archived successfully" : "Class deleted successfully" });
    } catch (err) {
        console.error("deleteClass error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all classes for the institution (with student count)
 */
exports.getClasses = async (req, res) => {
    try {
        const institution_id = req.institution_id;
        const {
            level,
            grade_level,
            form_level,
            stream,
            teacher_id,
            category_id,
            level_id,
            stream_id,
            include_deleted,
        } = req.query;

        const levelValue = toFiniteNumber(level);
        const gradeLevelValue = toFiniteNumber(grade_level);
        const formLevelValue = toFiniteNumber(form_level);
        const streamValue = normalizeStream(stream);
        const categoryIdValue = category_id ? String(category_id).trim() : null;
        const levelIdValue = level_id ? String(level_id).trim() : null;
        const streamIdValue = stream_id ? String(stream_id).trim() : null;
        const useDomain = await supportsClassDomainTables();
        const hasClassType = await supportsClassesClassType();

        const meta = await getInstitutionCategoryMeta(institution_id);
        const hasDeletedAt = await supportsClassesDeletedAt();

        const classSelectFields = [
            'id',
            'institution_id',
            'created_at',
            'updated_at',
            'teacher_id',
            'capacity',
            'grade_level',
            'form_level',
            'stream',
            'display_name',
            'category_id',
            'level_id',
            'stream_id',
            ...(hasClassType ? ['class_type'] : []),
        ].join(', ');

        let query = supabase
            .from('classes')
            .select(classSelectFields)
            .order('grade_level', { ascending: true })
            .order('form_level', { ascending: true })
            .order('stream', { ascending: true });

        if (institution_id) {
            query = query.eq("institution_id", institution_id);
        }

        if (hasDeletedAt && include_deleted !== 'true') {
            query = query.is('deleted_at', null);
        }

        if (levelValue !== undefined) {
            const hasForm = (meta.class_types || []).includes('Form');
            const hasNonForm = (meta.class_types || []).some((type) => type !== 'Form');
            if (hasForm && hasNonForm) {
                query = query.or(`grade_level.eq.${levelValue},form_level.eq.${levelValue}`);
            } else if (hasForm) {
                query = query.eq('form_level', levelValue);
            } else {
                query = query.eq('grade_level', levelValue);
            }
        }

        if (gradeLevelValue !== undefined) {
            query = query.eq('grade_level', gradeLevelValue);
        }

        if (formLevelValue !== undefined) {
            query = query.eq('form_level', formLevelValue);
        }

        if (streamValue !== undefined) {
            query = query.ilike('stream', streamValue);
        }

        if (teacher_id) {
            query = query.eq('teacher_id', teacher_id);
        }

        if (useDomain) {
            if (categoryIdValue) query = query.eq('category_id', categoryIdValue);
            if (levelIdValue) query = query.eq('level_id', levelIdValue);
            if (streamIdValue) query = query.eq('stream_id', streamIdValue);
        }

        const { data: classes, error } = await query;

        if (error) throw error;

        const classTypeByLevelId = await getClassTypesByLevelIds((classes || []).map((row) => row.level_id));

        // Get student counts for each class
        const classesWithCounts = await Promise.all(
            (classes || []).map(async (cls) => {
                const { count } = await supabase
                    .from("class_enrollments")
                    .select("id", { count: "exact", head: true })
                    .eq("class_id", cls.id);

                return {
                    ...normalizeClassRecord({
                        ...cls,
                        class_type: cls.class_type || classTypeByLevelId[cls.level_id] || meta.class_type,
                    }, meta),
                    student_count: count || 0,
                };
            })
        );

        res.json(classesWithCounts);
    } catch (err) {
        console.error("getClasses error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getClassOptions = async (req, res) => {
    try {
        const institution_id = req.institution_id;

        if (!institution_id) {
            return res.status(400).json({ error: 'Institution context is required' });
        }

        const meta = await getInstitutionCategoryMeta(institution_id);
        const defaultClassType = meta.class_type || 'Grade';
        const hasDeletedAt = await supportsClassesDeletedAt();
        const useDomain = await supportsClassDomainTables();

        if (useDomain) {
            const domain = await getClassDomainOptions(institution_id);

            const levelOptions = domain.levels.map((level) => ({
                value: level.level_number,
                label: level.name || `${level.category_types?.name || defaultClassType} ${level.level_number}`,
                level_id: level.id,
                category_id: level.category_id,
                class_type: level.category_types?.name || defaultClassType,
            }));

            const streamOptions = domain.streams.map((streamRow) => ({
                id: streamRow.id,
                level_id: streamRow.level_id,
                code: streamRow.code,
                label: streamRow.name || streamRow.code,
            }));

            return res.json({
                institution_id,
                institution_name: meta.institution_name,
                school_category_name: meta.school_category_name,
                class_type: defaultClassType,
                class_types: meta.class_types || [defaultClassType],
                level_options: levelOptions,
                stream_options: streamOptions,
                categories: domain.categories,
                levels: domain.levels,
                streams: domain.streams,
            });
        }

        const levelColumn = defaultClassType === 'Form' ? 'form_level' : 'grade_level';

        const [classesResponse, studentsResponse] = await Promise.all([
            hasDeletedAt
                ? supabase
                    .from('classes')
                    .select(`${levelColumn}, stream`)
                    .eq('institution_id', institution_id)
                    .is('deleted_at', null)
                : supabase
                    .from('classes')
                    .select(`${levelColumn}, stream`)
                    .eq('institution_id', institution_id),
            supabase
                .from('students')
                .select(levelColumn)
                .eq('institution_id', institution_id),
        ]);

        if (classesResponse.error) throw classesResponse.error;
        if (studentsResponse.error) throw studentsResponse.error;

        const levelSet = new Set();
        for (const row of classesResponse.data || []) {
            const v = toFiniteNumber(row?.[levelColumn]);
            if (v !== undefined) levelSet.add(v);
        }
        for (const row of studentsResponse.data || []) {
            const v = toFiniteNumber(row?.[levelColumn]);
            if (v !== undefined) levelSet.add(v);
        }

        const sortedLevels = Array.from(levelSet).sort((a, b) => a - b);
        const finalLevels = sortedLevels.length > 0 ? sortedLevels : buildDefaultLevelRange(defaultClassType);

        const streamSet = new Set();
        for (const row of classesResponse.data || []) {
            const s = normalizeStream(row?.stream);
            if (s) streamSet.add(s);
        }
        const streams = Array.from(streamSet).sort((a, b) => a.localeCompare(b));

        res.json({
            institution_id,
            institution_name: meta.institution_name,
            school_category_name: meta.school_category_name,
            class_type: defaultClassType,
            class_types: meta.class_types || [defaultClassType],
            level_options: finalLevels.map((value) => ({
                value,
                label: `${defaultClassType} ${value}`,
                class_type: defaultClassType,
            })),
            stream_options: streams.map((code) => ({
                id: code,
                code,
                label: code,
                level_id: null,
            })),
            categories: [],
            levels: [],
            streams: [],
        });
    } catch (err) {
        console.error('getClassOptions error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get students enrolled in a specific class
 */
exports.getClassStudents = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, userRole } = req;

        let isClassTeacher = false;
        let allowedSubjectIds = [];

        if (userRole === 'teacher') {
            const { data: teacher } = await supabase.from('teachers').select('id').eq('user_id', userId).single();
            if (!teacher) return res.status(404).json({ error: "Teacher profile not found" });

            // Check if designated Class Teacher for this class
            const { data: cls } = await supabase
                .from('classes')
                .select('teacher_id')
                .eq('id', id)
                .single();

            if (cls && cls.teacher_id === teacher.id) {
                isClassTeacher = true;
            }

            // Find subjects where teacher is primary or assistant for this class
            const { data: primarySubjects } = await supabase
                .from('subjects')
                .select('id')
                .eq('class_id', id)
                .eq('teacher_id', teacher.id);
            
            const primarySubjectIds = (primarySubjects || []).map(s => s.id);

            const { data: assocSubjects } = await supabase
                .from('subject_teachers')
                .select('subject_id, subject:subjects!inner(class_id)')
                .eq('teacher_id', teacher.id)
                .eq('subject.class_id', id);

            const assocSubjectIds = (assocSubjects || []).map(s => s.subject_id);

            allowedSubjectIds = [...new Set([...primarySubjectIds, ...assocSubjectIds])];

            if (!isClassTeacher && allowedSubjectIds.length === 0) {
                return res.status(403).json({ error: "Access denied: You do not teach or manage this class" });
            }
        }

        const { data, error } = await supabase
            .from("class_enrollments")
            .select(`
        id,
        student_id,
        enrolled_at,
        students (
          id,
          grade_level,
          form_level,
          user_id,
            users:user_id (
              first_name,
              last_name,
              full_name,
              email
            )
        )
      `)
            .eq("class_id", id);

        if (error) throw error;

        let students = (data || []).map((enrollment) => ({
            enrollment_id: enrollment.id,
            student_id: enrollment.student_id,
            enrolled_at: enrollment.enrolled_at,
            full_name: enrollment.students?.users?.full_name || "Unknown",
            first_name: enrollment.students?.users?.first_name || "",
            last_name: enrollment.students?.users?.last_name || "",
            email: enrollment.students?.users?.email || "",
            grade_level: enrollment.students?.grade_level || "",
            form_level: enrollment.students?.form_level || "",
            level: enrollment.students?.grade_level || enrollment.students?.form_level || "",
        }));

        // Filter roster for subject-teacher scoped visibility
        if (userRole === 'teacher' && !isClassTeacher) {
            const { data: studentEnrollments } = await supabase
                .from('enrollments')
                .select('student_id')
                .in('subject_id', allowedSubjectIds)
                .eq('status', 'enrolled');

            const enrolledStudentIds = new Set((studentEnrollments || []).map(se => se.student_id));
            students = students.filter(s => enrolledStudentIds.has(s.student_id));
        }

        res.json(students);
    } catch (err) {
        console.error("getClassStudents error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Enroll a student in a class
 */
exports.enrollStudent = async (req, res) => {
    try {
        const { id } = req.params; // class_id
        const { student_id } = req.body;

        if (!student_id) {
            return res.status(400).json({ error: "student_id is required" });
        }

        // Check if class exists
        const { data: cls, error: classErr } = await supabase
            .from("classes")
            .select("id, capacity")
            .eq("id", id)
            .single();

        if (classErr || !cls) {
            return res.status(404).json({ error: "Class not found" });
        }

        // Check capacity
        if (cls.capacity) {
            const { count } = await supabase
                .from("class_enrollments")
                .select("id", { count: "exact", head: true })
                .eq("class_id", id);

            if (count >= cls.capacity) {
                return res.status(400).json({ error: "Class has reached maximum capacity" });
            }
        }

        const data = await assignStudentToSingleClass({
            studentId: student_id,
            classId: id,
            institutionId: req.institution_id,
            syncStudentLevel: true,
        });

        res.status(201).json(data);
    } catch (err) {
        console.error("enrollStudent error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Remove a student from a class
 */
exports.removeStudent = async (req, res) => {
    try {
        const { id, studentId } = req.params;

        const { error } = await supabase
            .from("class_enrollments")
            .delete()
            .eq("class_id", id)
            .eq("student_id", studentId);

        if (error) throw error;
        res.json({ message: "Student removed from class" });
    } catch (err) {
        console.error("removeStudent error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Auto-assign unassigned students to classes for a given grade level.
 * Uses round-robin distribution, respecting capacity limits.
 */
exports.autoAssignStudents = async (req, res) => {
    try {
        const { grade_level, form_level } = req.body;
        const institution_id = req.institution_id;
        const meta = await getInstitutionCategoryMeta(institution_id);
        const hasDeletedAt = await supportsClassesDeletedAt();
        const normalizedGradeLevel = toFiniteNumber(grade_level);
        const normalizedFormLevel = toFiniteNumber(form_level);

        if (normalizedGradeLevel === undefined && normalizedFormLevel === undefined) {
            return res.status(400).json({ error: "grade_level or form_level is required" });
        }

        // 1. Get all classes for this grade level
        const hasClassType = await supportsClassesClassType();
        let classQuery = supabase
            .from('classes')
            .select(hasClassType
                ? 'id, institution_id, grade_level, form_level, stream, display_name, capacity, class_type'
                : 'id, institution_id, grade_level, form_level, stream, display_name, capacity');

        if (institution_id) {
            classQuery = classQuery.eq("institution_id", institution_id);
        }

        if (hasDeletedAt) {
            classQuery = classQuery.is('deleted_at', null);
        }

        if (normalizedGradeLevel !== undefined) {
            classQuery = classQuery.eq('grade_level', normalizedGradeLevel);
        }
        if (normalizedFormLevel !== undefined) {
            classQuery = classQuery.eq('form_level', normalizedFormLevel);
        }

        const { data: classes, error: classErr } = await classQuery;
        if (classErr) throw classErr;

        if (!classes || classes.length === 0) {
            return res.status(400).json({ error: `No classes found for selected ${meta.class_type.toLowerCase()} level` });
        }

        // 2. Get current enrollment counts per class
        const classData = await Promise.all(
            classes.map(async (cls) => {
                const { count } = await supabase
                    .from("class_enrollments")
                    .select("id", { count: "exact", head: true })
                    .eq("class_id", cls.id);

                return {
                    ...cls,
                    current_count: count || 0,
                };
            })
        );

        // 3. Get all students of this grade/form not enrolled in any class
        let studentQuery = supabase
            .from("students")
            .select("id, grade_level, form_level");

        if (institution_id) {
            studentQuery = studentQuery.eq('institution_id', institution_id);
        }

        if (normalizedGradeLevel !== undefined) {
            studentQuery = studentQuery.eq("grade_level", normalizedGradeLevel);
        }
        if (normalizedFormLevel !== undefined) {
            studentQuery = studentQuery.eq("form_level", normalizedFormLevel);
        }

        const { data: allStudents, error: studErr } = await studentQuery;

        if (studErr) throw studErr;

        if (!allStudents || allStudents.length === 0) {
            return res.json({ assigned: 0, message: "No students found for this grade level" });
        }

        // Get students already enrolled in ANY class
        const studentIds = allStudents.map((s) => s.id);
        const { data: enrolled } = await supabase
            .from("class_enrollments")
            .select("student_id")
            .in("student_id", studentIds);

        const enrolledSet = new Set((enrolled || []).map((e) => e.student_id));
        const unassigned = allStudents.filter((s) => !enrolledSet.has(s.id));

        if (unassigned.length === 0) {
            return res.json({ assigned: 0, message: "All students are already assigned to classes" });
        }

        // 4. Round-robin assignment sorted by current count (lowest first)
        classData.sort((a, b) => a.current_count - b.current_count);

        const assignments = [];
        let classIdx = 0;

        for (const student of unassigned) {
            // Find next class with available capacity
            let attempts = 0;
            while (attempts < classData.length) {
                const cls = classData[classIdx % classData.length];
                const hasCapacity = !cls.capacity || cls.current_count < cls.capacity;

                if (hasCapacity) {
                    assignments.push({
                        class_id: cls.id,
                        student_id: student.id,
                    });
                    cls.current_count++;
                    classIdx++;
                    break;
                }

                classIdx++;
                attempts++;
            }
        }

        if (assignments.length === 0) {
            return res.json({ assigned: 0, message: "All classes are at capacity" });
        }

        // 5. Bulk insert
        const { error: insertErr } = await supabase
            .from("class_enrollments")
            .insert(assignments);

        if (insertErr) throw insertErr;

        // Build summary
        const summary = classData.map((cls) => ({
            class_name: buildClassLabel(cls),
            total_students: cls.current_count,
        }));

        res.json({
            assigned: assignments.length,
            total_unassigned_before: unassigned.length,
            classes: summary,
            message: `Successfully assigned ${assignments.length} students across ${classData.length} classes`,
        });
    } catch (err) {
        console.error("autoAssignStudents error:", err);
        res.status(500).json({ error: err.message });
    }
};
