const supabase = require("../utils/supabaseClient.js");

const isMissingRelationError = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return code === '42p01' || code === '42703' || message.includes('does not exist');
};

const sortAndNormalizeTypeNames = (types) => {
  const pairs = (types || [])
    .map((row) => ({
      name: String(row?.category_types?.name || '').trim(),
      sort_order: Number(row?.category_types?.sort_order) || 100,
    }))
    .filter((row) => row.name);

  pairs.sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name));
  return [...new Set(pairs.map((row) => row.name))];
};

const toUuidString = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const normalizeCategoryIds = (payload) => {
  if (Array.isArray(payload?.category_ids)) {
    return [...new Set(payload.category_ids.map(toUuidString).filter(Boolean))];
  }
  const single = toUuidString(payload?.category_id);
  return single ? [single] : [];
};

const syncInstitutionCategories = async (institutionId, categoryIds = []) => {
  const normalizedInstitutionId = toUuidString(institutionId);
  if (!normalizedInstitutionId) return;

  const normalizedCategoryIds = [...new Set((categoryIds || []).map(toUuidString).filter(Boolean))];

  const { data: existingRows, error: existingError } = await supabase
    .from('institution_categories')
    .select('category_id')
    .eq('institution_id', normalizedInstitutionId);

  if (existingError) {
    if (isMissingRelationError(existingError)) return;
    throw existingError;
  }

  const existing = new Set((existingRows || []).map((row) => toUuidString(row.category_id)).filter(Boolean));
  const next = new Set(normalizedCategoryIds);

  const toInsert = normalizedCategoryIds.filter((id) => !existing.has(id));
  const toDelete = [...existing].filter((id) => !next.has(id));

  if (toInsert.length > 0) {
    const payload = toInsert.map((categoryId) => ({
      institution_id: normalizedInstitutionId,
      category_id: categoryId,
    }));
    const { error } = await supabase.from('institution_categories').insert(payload);
    if (error) {
      if (isMissingRelationError(error)) return;
      throw error;
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('institution_categories')
      .delete()
      .eq('institution_id', normalizedInstitutionId)
      .in('category_id', toDelete);
    if (error) {
      if (isMissingRelationError(error)) return;
      throw error;
    }
  }
};

const loadCategoryMap = async (institutionIds) => {
  const cleanIds = [...new Set((institutionIds || []).map(toUuidString).filter(Boolean))];
  if (cleanIds.length === 0) return new Map();

  let data = null;
  let error = null;
  let usedLegacyShape = false;

  ({ data, error } = await supabase
    .from('institution_categories')
    .select('institution_id, category_id, school_categories:category_id(id, name, school_category_types(type_id, category_types:type_id(name, sort_order)))')
    .in('institution_id', cleanIds));

  if (error && isMissingRelationError(error)) {
    usedLegacyShape = true;
    ({ data, error } = await supabase
      .from('institution_categories')
      .select('institution_id, category_id, school_categories:category_id(id, name, level_label)')
      .in('institution_id', cleanIds));
  }

  if (error) {
    if (isMissingRelationError(error)) return new Map();
    throw error;
  }

  const map = new Map();
  for (const row of data || []) {
    const institutionId = toUuidString(row.institution_id);
    if (!institutionId) continue;
    if (!map.has(institutionId)) map.set(institutionId, []);

    const classTypes = usedLegacyShape
      ? (row.school_categories?.level_label ? [String(row.school_categories.level_label).trim()] : [])
      : sortAndNormalizeTypeNames(row.school_categories?.school_category_types || []);

    map.get(institutionId).push({
      id: row.school_categories?.id || row.category_id,
      name: row.school_categories?.name || null,
      class_type: classTypes[0] || null,
      class_types: classTypes,
    });
  }

  return map;
};

exports.createInstitution = async (req, res) => {
  // Only platform admins can create institutions
  if (req.userRole !== "master_admin") {
    return res
      .status(403)
      .json({ error: "Only master admins can create institutions" });
  }

  const { name, location, email } = req.body;
  const categoryIds = normalizeCategoryIds(req.body);
  const plan = 'basic';
  if (!name)
    return res.status(400).json({ error: "Institution name is required" });

  // Simplified: All new institutions start with 'active' status.
  const subscription_status = 'active';
  const subscription_cycle = 'monthly';

  const { data, error } = await supabase
    .from("institutions")
    .insert([{
      name,
      location,
      email: email || null,
      subscription_plan: plan,
      subscription_status,
      has_used_trial: true,
      subscription_tracking_start_date: new Date().toISOString(),
      subscription_cycle,
      category_id: categoryIds[0] || null
    }])
    .select()
    .single();

  if (error) {
    console.error("Institution creation error:", error);
    return res.status(500).json({ error: error.message });
  }
  if (categoryIds.length > 0) {
    await syncInstitutionCategories(data.id, categoryIds);
  }

  res.status(201).json({
    message: "Institution created successfully",
    institution: {
      ...data,
      category_ids: categoryIds,
    },
  });
};

exports.getInstitutions = async (_req, res) => {
  const { data, error } = await supabase
    .from("institutions")
    .select("*")
    .order('name');

  if (error) return res.status(500).json({ error: error.message });
  try {
    const categoryMap = await loadCategoryMap((data || []).map((row) => row.id));
    const institutions = (data || []).map((inst) => {
      const categories = categoryMap.get(inst.id) || [];
      return {
        ...inst,
        category_ids: categories.map((cat) => cat.id).filter(Boolean),
        categories,
      };
    });
    res.json(institutions);
  } catch (categoryError) {
    return res.status(500).json({ error: categoryError.message || 'Failed to load institution categories' });
  }
};

exports.getInstitutionDetails = async (req, res) => {
  try {
    const { institution_id } = req;
    if (!institution_id) return res.json(null); // Return null instead of error

    const { data, error } = await supabase
      .from("institutions")
      .select("*")
      .eq("id", institution_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.json(null); // Not found
      throw error;
    }
    const categoryMap = await loadCategoryMap([institution_id]);
    const categories = categoryMap.get(institution_id) || [];
    res.json({
      ...data,
      category_ids: categories.map((cat) => cat.id).filter(Boolean),
      categories,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateInstitution = async (req, res) => {
  try {
    const { institution_id, userRole } = req;
    if (userRole !== 'admin') return res.status(403).json({ error: "Unauthorized" });

    // Allow specifying an ID in params if super-admin, but usually scoped to current user's institution
    const targetId = req.params.id || institution_id;
    if (!targetId) return res.status(400).json({ error: "Target institution ID required" });

    const { name, location, phone, email, type, principal_name, category_id } = req.body;
    const categoryIds = normalizeCategoryIds(req.body);

    // We allow name to be NOT NULL, but others are nullable.
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (type !== undefined) updates.type = type;
    if (principal_name !== undefined) updates.principal_name = principal_name;
    if (category_id !== undefined) updates.category_id = category_id;
    if (req.body.category_ids !== undefined) updates.category_id = categoryIds[0] || null;

    const { data, error } = await supabase
      .from("institutions")
      .update(updates)
      .eq("id", targetId)
      .select()
      .single();

    if (error) throw error;
    if (category_id !== undefined || req.body.category_ids !== undefined) {
      await syncInstitutionCategories(targetId, categoryIds);
    }

    const categoryMap = await loadCategoryMap([targetId]);
    const categories = categoryMap.get(targetId) || [];

    res.json({
      message: "Institution updated",
      institution: {
        ...data,
        category_ids: categories.map((cat) => cat.id).filter(Boolean),
        categories,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    // Assuming middleware attaches institution_id
    const { institution_id } = req;
    // If no institution_id in req (e.g. superadmin?), maybe fetch all? 
    // But typically we want for specific institution.

    let query = supabase.from("classes").select("*");
    if (institution_id) {
      query = query.eq("institution_id", institution_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
