// backend/controllers/feeStructure.controller.js
const supabase = require("../utils/supabaseClient.js");
const LedgerService = require("../services/ledger.service.js");
const { compilePdfBuffer } = require("../services/pdfCompiler.service.js");
const { roundCurrency, roundPercentage } = require("../utils/numericStandards.js");

/**
 * 1. FEE STRUCTURE BUILDER & MANAGEMENT
 */

// List fee structures with period, level, status, items count, and version
exports.getFeeStructuresV2 = async (req, res) => {
    try {
        const { institution_id } = req;
        const { academic_year_id, term_id, status } = req.query;

        let query = supabase
            .from('fee_structures')
            .select(`
                id,
                title,
                description,
                amount,
                due_date,
                academic_year,
                academic_year_id,
                term,
                term_id,
                period_type,
                level_scope,
                level_value,
                level_from,
                level_to,
                status,
                version_number,
                change_reason,
                parent_preview_notes,
                published_at,
                is_linked_sync,
                copied_from_id,
                created_at,
                updated_at,
                items:fee_types(id, name, amount, kind, is_optional, billing_frequency, status)
            `)
            .eq('institution_id', institution_id)
            .order('created_at', { ascending: false });

        if (academic_year_id) query = query.eq('academic_year_id', academic_year_id);
        if (term_id && term_id !== '__annual') query = query.eq('term_id', term_id);
        if (status && status !== 'all') query = query.eq('status', status);

        const { data: structures, error } = await query;
        if (error) throw error;

        // Calculate summary metrics per structure
        const formatted = (structures || []).map(s => {
            const allItems = s.items || [];
            const mandatoryItems = allItems.filter(i => !i.is_optional && i.status !== 'archived');
            const optionalItems = allItems.filter(i => i.is_optional && i.status !== 'archived');
            const totalMandatory = mandatoryItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

            return {
                ...s,
                items_count: allItems.length,
                mandatory_count: mandatoryItems.length,
                optional_count: optionalItems.length,
                total_mandatory_amount: totalMandatory,
                is_released: s.status === 'published',
                lifecycle_status: s.status === 'published' ? 'Released' : (s.status === 'draft' ? 'Draft' : 'Completed')
            };
        });

        res.json(formatted);
    } catch (err) {
        console.error('getFeeStructuresV2 error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get full details of a specific fee structure including all items, variants, and catalog links
exports.getFeeStructureDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        const { data: structure, error: sErr } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (sErr || !structure) {
            return res.status(404).json({ error: 'Fee structure not found' });
        }

        // Fetch fee items for this structure
        const { data: feeItems, error: fiErr } = await supabase
            .from('fee_types')
            .select(`
                *,
                category:fee_categories(id, name),
                variants:fee_item_variants(
                    id,
                    catalog_id,
                    option_group,
                    option_name,
                    combination_key,
                    price,
                    is_active,
                    display_order
                )
            `)
            .or(`fee_structure_id.eq.${id},id.eq.${id}`)
            .eq('institution_id', institution_id)
            .order('display_order', { ascending: true });

        if (fiErr) throw fiErr;

        const mandatoryItems = (feeItems || []).filter(i => !i.is_optional && i.status !== 'archived');
        const optionalItems = (feeItems || []).filter(i => i.is_optional && i.status !== 'archived');
        const totalMandatory = mandatoryItems.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

        res.json({
            ...structure,
            items: feeItems || [],
            mandatory_items: mandatoryItems,
            optional_items: optionalItems,
            total_mandatory_amount: totalMandatory
        });
    } catch (err) {
        console.error('getFeeStructureDetails error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Create a new fee structure container and its items
exports.createFeeStructureV2 = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const {
            title,
            description,
            academic_year_id,
            academic_year,
            term_id,
            term,
            period_type = 'term',
            level_scope = 'all',
            level_value,
            level_from,
            level_to,
            due_date,
            payment_instructions,
            parent_preview_notes,
            items = []
        } = req.body;

        if (!title?.trim()) {
            return res.status(400).json({ error: "Structure title is required." });
        }

        // 1. Create structure row
        const { data: structure, error: sErr } = await supabase
            .from('fee_structures')
            .insert([{
                institution_id,
                title: title.trim(),
                description: description?.trim() || null,
                academic_year_id: academic_year_id || null,
                academic_year: academic_year || null,
                term_id: term_id === '__annual' ? null : (term_id || null),
                term: term || 'Annual',
                period_type,
                level_scope,
                level_value: Number.isFinite(Number(level_value)) ? Number(level_value) : null,
                level_from: Number.isFinite(Number(level_from)) ? Number(level_from) : null,
                level_to: Number.isFinite(Number(level_to)) ? Number(level_to) : null,
                due_date: due_date || null,
                payment_instructions: payment_instructions || null,
                parent_preview_notes: parent_preview_notes || null,
                status: 'draft',
                version_number: 1,
                amount: 0.00
            }])
            .select()
            .single();

        if (sErr) throw sErr;

        // 2. Insert items if provided
        let totalStructureAmount = 0;
        if (items && items.length > 0) {
            for (let idx = 0; idx < items.length; idx++) {
                const item = items[idx];
                const itemAmount = Number(item.amount) || 0;
                if (!item.is_optional) {
                    totalStructureAmount += itemAmount;
                }

                const { data: feeType, error: ftErr } = await supabase
                    .from('fee_types')
                    .insert([{
                        institution_id,
                        fee_structure_id: structure.id,
                        category_id: item.category_id || null,
                        name: item.name.trim(),
                        description: item.description?.trim() || null,
                        amount: itemAmount,
                        kind: item.kind || 'fee',
                        billing_frequency: item.billing_frequency || 'term',
                        academic_year_id: structure.academic_year_id,
                        term_id: structure.term_id,
                        due_date: item.due_date || structure.due_date,
                        is_mandatory: !item.is_optional,
                        is_optional: Boolean(item.is_optional),
                        optional_default: item.optional_default || 'opt_in',
                        selection_deadline: item.selection_deadline || null,
                        allows_quantity: Boolean(item.allows_quantity),
                        min_quantity: Number(item.min_quantity) || 1,
                        max_quantity: Number(item.max_quantity) || 1,
                        unit_price: Number(item.unit_price) || itemAmount,
                        unit_label: item.unit_label || null,
                        term_split: item.term_split || { split_type: 'equal', splits: [] },
                        eligibility_rules: item.eligibility_rules || { target: 'all' },
                        proration_policy: item.proration_policy || 'prorate',
                        has_variants: Boolean(item.variants && item.variants.length > 0),
                        partial_payment_allowed: item.partial_payment_allowed !== false,
                        min_installment_amount: Number(item.min_installment_amount) || 0.00,
                        display_order: idx + 1,
                        status: 'active',
                        parent_notes: item.parent_notes || null
                    }])
                    .select()
                    .single();

                if (ftErr) throw ftErr;

                // Insert Variants if item has variant options
                if (item.variants && item.variants.length > 0) {
                    const variantRows = item.variants.map((v, vIdx) => ({
                        institution_id,
                        fee_type_id: feeType.id,
                        catalog_id: v.catalog_id || null,
                        option_group: v.option_group || 'Options',
                        option_name: v.option_name,
                        combination_key: v.combination_key || v.option_name,
                        price: Number(v.price) || 0.00,
                        is_active: v.is_active !== false,
                        display_order: vIdx + 1
                    }));

                    await supabase.from('fee_item_variants').insert(variantRows);
                }
            }

            // Update container total amount
            await supabase
                .from('fee_structures')
                .update({ amount: totalStructureAmount })
                .eq('id', structure.id);
        }

        res.status(201).json({
            success: true,
            structure: { ...structure, amount: totalStructureAmount }
        });
    } catch (err) {
        console.error('createFeeStructureV2 error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update fee structure (handles draft edits or creates versioned revision if already published)
exports.updateFeeStructureV2 = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userId } = req;
        const {
            title,
            description,
            due_date,
            period_type,
            payment_instructions,
            parent_preview_notes,
            change_reason,
            items
        } = req.body;

        const { data: existing, error: eErr } = await supabase
            .from('fee_structures')
            .select('*')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (eErr || !existing) {
            return res.status(404).json({ error: "Fee structure not found" });
        }

        const isPublished = existing.status === 'published';
        const newVersion = isPublished ? existing.version_number + 1 : existing.version_number;

        // 1. Update structure metadata
        const updatePayload = {
            updated_at: new Date().toISOString(),
            status_updated_at: new Date().toISOString()
        };
        if (title) updatePayload.title = title.trim();
        if (description !== undefined) updatePayload.description = description?.trim() || null;
        if (due_date) updatePayload.due_date = due_date;
        if (period_type) updatePayload.period_type = period_type;
        if (payment_instructions !== undefined) updatePayload.payment_instructions = payment_instructions;
        if (parent_preview_notes !== undefined) updatePayload.parent_preview_notes = parent_preview_notes;
        if (change_reason) updatePayload.change_reason = change_reason;
        if (isPublished) updatePayload.version_number = newVersion;

        const { data: updatedStructure, error: uErr } = await supabase
            .from('fee_structures')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();

        if (uErr) throw uErr;

        // 2. If items were supplied, update or synchronize items
        if (Array.isArray(items)) {
            let totalAmount = 0;
            for (let idx = 0; idx < items.length; idx++) {
                const item = items[idx];
                const itemAmount = Number(item.amount) || 0;
                if (!item.is_optional) totalAmount += itemAmount;

                if (item.id && !item.is_new) {
                    // Update existing item
                    await supabase
                        .from('fee_types')
                        .update({
                            name: item.name,
                            description: item.description,
                            amount: itemAmount,
                            category_id: item.category_id || null,
                            billing_frequency: item.billing_frequency || 'term',
                            due_date: item.due_date || updatedStructure.due_date,
                            is_mandatory: !item.is_optional,
                            is_optional: Boolean(item.is_optional),
                            kind: item.kind || 'fee',
                            allows_quantity: Boolean(item.allows_quantity),
                            min_quantity: Number(item.min_quantity) || 1,
                            max_quantity: Number(item.max_quantity) || 1,
                            unit_price: Number(item.unit_price) || itemAmount,
                            optional_default: item.optional_default || 'opt_in',
                            selection_deadline: item.selection_deadline || null,
                            term_split: item.term_split || { split_type: 'equal', splits: [] },
                            eligibility_rules: item.eligibility_rules || { target: 'all' },
                            proration_policy: item.proration_policy || 'prorate',
                            display_order: idx + 1,
                            status: item.status || 'active',
                            parent_notes: item.parent_notes || null,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.id)
                        .eq('institution_id', institution_id);

                    // Update variants if provided
                    if (Array.isArray(item.variants)) {
                        // Delete old variants and reinsert
                        await supabase.from('fee_item_variants').delete().eq('fee_type_id', item.id);
                        if (item.variants.length > 0) {
                            const variantRows = item.variants.map((v, vIdx) => ({
                                institution_id,
                                fee_type_id: item.id,
                                catalog_id: v.catalog_id || null,
                                option_group: v.option_group || 'Options',
                                option_name: v.option_name,
                                combination_key: v.combination_key || v.option_name,
                                price: Number(v.price) || 0.00,
                                is_active: v.is_active !== false,
                                display_order: vIdx + 1
                            }));
                            await supabase.from('fee_item_variants').insert(variantRows);
                        }
                    }
                } else {
                    // Insert new fee item
                    const { data: newItem } = await supabase
                        .from('fee_types')
                        .insert([{
                            institution_id,
                            fee_structure_id: id,
                            category_id: item.category_id || null,
                            name: item.name,
                            description: item.description,
                            amount: itemAmount,
                            kind: item.kind || 'fee',
                            billing_frequency: item.billing_frequency || 'term',
                            academic_year_id: updatedStructure.academic_year_id,
                            term_id: updatedStructure.term_id,
                            due_date: item.due_date || updatedStructure.due_date,
                            is_mandatory: !item.is_optional,
                            is_optional: Boolean(item.is_optional),
                            optional_default: item.optional_default || 'opt_in',
                            selection_deadline: item.selection_deadline || null,
                            allows_quantity: Boolean(item.allows_quantity),
                            min_quantity: Number(item.min_quantity) || 1,
                            max_quantity: Number(item.max_quantity) || 1,
                            unit_price: Number(item.unit_price) || itemAmount,
                            term_split: item.term_split || { split_type: 'equal', splits: [] },
                            eligibility_rules: item.eligibility_rules || { target: 'all' },
                            proration_policy: item.proration_policy || 'prorate',
                            display_order: idx + 1,
                            status: 'active',
                            parent_notes: item.parent_notes || null
                        }])
                        .select()
                        .single();

                    if (newItem && Array.isArray(item.variants) && item.variants.length > 0) {
                        const variantRows = item.variants.map((v, vIdx) => ({
                            institution_id,
                            fee_type_id: newItem.id,
                            catalog_id: v.catalog_id || null,
                            option_group: v.option_group || 'Options',
                            option_name: v.option_name,
                            combination_key: v.combination_key || v.option_name,
                            price: Number(v.price) || 0.00,
                            is_active: v.is_active !== false,
                            display_order: vIdx + 1
                        }));
                        await supabase.from('fee_item_variants').insert(variantRows);
                    }
                }
            }

            await supabase
                .from('fee_structures')
                .update({ amount: totalAmount })
                .eq('id', id);
        }

        res.json({ success: true, structure: updatedStructure });
    } catch (err) {
        console.error('updateFeeStructureV2 error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Copy fee structure to another level or period ("independent copy" or "linked sync")
exports.copyFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;
        const {
            target_level_value,
            target_level_scope = 'grade',
            target_academic_year_id,
            target_academic_year,
            target_term_id,
            target_term,
            title,
            is_linked_sync = false
        } = req.body;

        const { data: source, error: sErr } = await supabase
            .from('fee_structures')
            .select('*, items:fee_types(*, variants:fee_item_variants(*))')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (sErr || !source) {
            return res.status(404).json({ error: "Source fee structure not found" });
        }

        const newTitle = title || `${source.title} (Copy)`;

        // 1. Create destination structure
        const { data: newStructure, error: nErr } = await supabase
            .from('fee_structures')
            .insert([{
                institution_id,
                title: newTitle,
                description: source.description,
                academic_year_id: target_academic_year_id || source.academic_year_id,
                academic_year: target_academic_year || source.academic_year,
                term_id: target_term_id || source.term_id,
                term: target_term || source.term,
                period_type: source.period_type,
                level_scope: target_level_scope,
                level_value: Number.isFinite(Number(target_level_value)) ? Number(target_level_value) : source.level_value,
                due_date: source.due_date,
                payment_instructions: source.payment_instructions,
                parent_preview_notes: source.parent_preview_notes,
                amount: source.amount,
                status: 'draft',
                version_number: 1,
                copied_from_id: source.id,
                is_linked_sync: Boolean(is_linked_sync),
                linked_source_id: is_linked_sync ? source.id : null
            }])
            .select()
            .single();

        if (nErr) throw nErr;

        // 2. Clone fee items & variants
        const sourceItems = source.items || [];
        for (const item of sourceItems) {
            const { data: clonedItem, error: ciErr } = await supabase
                .from('fee_types')
                .insert([{
                    institution_id,
                    fee_structure_id: newStructure.id,
                    category_id: item.category_id,
                    name: item.name,
                    description: item.description,
                    amount: item.amount,
                    kind: item.kind,
                    billing_frequency: item.billing_frequency,
                    academic_year_id: newStructure.academic_year_id,
                    term_id: newStructure.term_id,
                    due_date: item.due_date,
                    is_mandatory: item.is_mandatory,
                    is_optional: item.is_optional,
                    optional_default: item.optional_default,
                    selection_deadline: item.selection_deadline,
                    allows_quantity: item.allows_quantity,
                    min_quantity: item.min_quantity,
                    max_quantity: item.max_quantity,
                    unit_price: item.unit_price,
                    unit_label: item.unit_label,
                    term_split: item.term_split,
                    eligibility_rules: item.eligibility_rules,
                    proration_policy: item.proration_policy,
                    display_order: item.display_order,
                    status: 'active',
                    parent_notes: item.parent_notes
                }])
                .select()
                .single();

            if (!ciErr && clonedItem && item.variants && item.variants.length > 0) {
                const variantRows = item.variants.map(v => ({
                    institution_id,
                    fee_type_id: clonedItem.id,
                    catalog_id: v.catalog_id,
                    option_group: v.option_group,
                    option_name: v.option_name,
                    combination_key: v.combination_key,
                    price: v.price,
                    is_active: v.is_active,
                    display_order: v.display_order
                }));
                await supabase.from('fee_item_variants').insert(variantRows);
            }
        }

        res.status(201).json({
            success: true,
            structure: newStructure,
            message: `Fee structure successfully copied to ${newTitle}`
        });
    } catch (err) {
        console.error('copyFeeStructure error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Bulk percentage increase with preview
exports.bulkPercentageIncrease = async (req, res) => {
    try {
        const { institution_id } = req;
        const { structure_ids = [], percentage = 0, preview_only = true } = req.body;

        const factor = 1 + (Number(percentage) / 100);

        const { data: items, error } = await supabase
            .from('fee_types')
            .select('id, name, amount, fee_structure_id, fee_structures(title)')
            .in('fee_structure_id', structure_ids)
            .eq('institution_id', institution_id);

        if (error) throw error;

        const previewList = (items || []).map(i => {
            const currentAmount = Number(i.amount) || 0;
            const newAmount = roundCurrency(currentAmount * factor);
            return {
                id: i.id,
                name: i.name,
                structure_title: i.fee_structures?.title,
                current_amount: currentAmount,
                new_amount: newAmount,
                difference: roundCurrency(newAmount - currentAmount)
            };
        });

        if (preview_only) {
            return res.json({
                preview: true,
                percentage,
                items_affected: previewList.length,
                preview_items: previewList
            });
        }

        // Apply changes
        for (const p of previewList) {
            await supabase
                .from('fee_types')
                .update({ amount: p.new_amount, updated_at: new Date().toISOString() })
                .eq('id', p.id);
        }

        // Also scale variant prices
        const { data: variants } = await supabase
            .from('fee_item_variants')
            .select('id, price')
            .in('fee_type_id', previewList.map(p => p.id));

        for (const v of variants || []) {
            const currentPrice = Number(v.price) || 0;
            const newPrice = roundCurrency(currentPrice * factor);
            await supabase
                .from('fee_item_variants')
                .update({ price: newPrice, updated_at: new Date().toISOString() })
                .eq('id', v.id);
        }

        res.json({
            success: true,
            percentage,
            items_updated: previewList.length,
            message: `Successfully increased ${previewList.length} fee items by ${percentage}%.`
        });
    } catch (err) {
        console.error('bulkPercentageIncrease error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Publish fee structure and notify parents
exports.publishFeeStructure = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id, userId } = req;

        const { data: structure, error: sErr } = await supabase
            .from('fee_structures')
            .select('*, items:fee_types(*)')
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (sErr || !structure) {
            return res.status(404).json({ error: "Fee structure not found" });
        }

        if (!structure.items || structure.items.length === 0) {
            return res.status(400).json({ error: "Cannot publish an empty fee structure. Please add at least one fee item." });
        }

        const publishedAt = new Date().toISOString();

        const { data: published, error: pErr } = await supabase
            .from('fee_structures')
            .update({
                status: 'published',
                published_at: publishedAt,
                published_by: userId,
                released_at: publishedAt,
                updated_at: publishedAt
            })
            .eq('id', id)
            .select()
            .single();

        if (pErr) throw pErr;

        // Resolve students in this level and notify their parents
        const levelVal = structure.level_value;
        let stuQuery = supabase
            .from('students')
            .select('id, user_id, grade_level, form_level')
            .eq('institution_id', institution_id)
            .eq('status', 'active');

        if (Number.isFinite(Number(levelVal))) {
            stuQuery = stuQuery.or(`grade_level.eq.${levelVal},form_level.eq.${levelVal}`);
        }

        const { data: students } = await stuQuery;
        const stuIds = (students || []).map(s => s.id);

        if (stuIds.length > 0) {
            const { data: parents } = await supabase
                .from('parent_students')
                .select('parent:parents(user_id), student_id')
                .in('student_id', stuIds);

            const notifRows = (parents || [])
                .filter(p => p.parent?.user_id)
                .map(p => ({
                    institution_id,
                    user_id: p.parent.user_id,
                    title: `Fee Structure Published: ${structure.title}`,
                    message: `The official fee structure for ${structure.title} has been published. Review fees and choose your optional services.`,
                    type: 'fee_structure_published',
                    reference_id: structure.id,
                    reference_type: 'fee_structure',
                    created_at: publishedAt
                }));

            if (notifRows.length > 0) {
                await supabase.from('notifications').insert(notifRows).catch(() => {});
            }
        }

        res.json({
            success: true,
            structure: published,
            recipients_notified: stuIds.length
        });
    } catch (err) {
        console.error('publishFeeStructure error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Parent view preview for admins before publishing
exports.getParentViewPreview = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        const { data: structure, error } = await supabase
            .from('fee_structures')
            .select(`
                *,
                items:fee_types(
                    *,
                    category:fee_categories(name),
                    variants:fee_item_variants(*)
                )
            `)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .single();

        if (error || !structure) return res.status(404).json({ error: "Structure not found" });

        const items = structure.items || [];
        const mandatory = items.filter(i => !i.is_optional && i.status !== 'archived');
        const optional = items.filter(i => i.is_optional && i.status !== 'archived');
        const mandatoryTotal = mandatory.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);

        res.json({
            structure_id: structure.id,
            title: structure.title,
            period_name: structure.term ? `${structure.term} ${structure.academic_year || ''}` : structure.academic_year,
            level_name: structure.level_scope === 'all' ? 'All Grades' : `Grade ${structure.level_value || ''}`,
            mandatory_total: mandatoryTotal,
            mandatory_items: mandatory,
            optional_items: optional,
            parent_preview_notes: structure.parent_preview_notes,
            payment_instructions: structure.payment_instructions
        });
    } catch (err) {
        console.error('getParentViewPreview error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * 2. PDF COMPILATION ENDPOINTS FOR FEE STRUCTURE & STATEMENTS
 */

exports.compileFeeStructurePdf = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        const pdfData = await assembleFeeStructurePdfPayload(id, institution_id);
        const pdfBuffer = await compilePdfBuffer({ document_type: 'fee_structure', data: pdfData });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="FeeStructure-${pdfData.level_name.replace(/\s+/g, '_')}.pdf"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        return res.end(pdfBuffer);
    } catch (err) {
        console.error('compileFeeStructurePdf error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.compileFeeStructureBase64 = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        const pdfData = await assembleFeeStructurePdfPayload(id, institution_id);
        const pdfBuffer = await compilePdfBuffer({ document_type: 'fee_structure', data: pdfData });

        res.json({
            base64: pdfBuffer.toString('base64'),
            filename: `FeeStructure-${(pdfData.level_name || 'Schedule').replace(/\s+/g, '_')}.pdf`
        });
    } catch (err) {
        console.error('compileFeeStructureBase64 error:', err);
        res.status(500).json({ error: err.message });
    }
};

async function assembleFeeStructurePdfPayload(structureId, institutionId) {
    const { data: inst } = await supabase
        .from('institutions')
        .select('name, logo_url')
        .eq('id', institutionId)
        .maybeSingle();

    const { data: structure } = await supabase
        .from('fee_structures')
        .select(`
            *,
            items:fee_types(
                *,
                category:fee_categories(name),
                variants:fee_item_variants(*)
            )
        `)
        .eq('id', structureId)
        .eq('institution_id', institutionId)
        .single();

    if (!structure) throw new Error("Fee structure not found");

    const items = structure.items || [];
    const mandatory = items.filter(i => !i.is_optional && i.status !== 'archived');
    const optional = items.filter(i => i.is_optional && i.status !== 'archived');

    const { data: methods } = await supabase
        .from('payment_methods')
        .select('name, description, instructions')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

    return {
        institution_name: inst?.name || "Academic Institution",
        institution_logo: inst?.logo_url,
        structure_id: structure.id,
        level_name: structure.level_scope === 'all' ? 'All Classes' : `Grade ${structure.level_value || ''}`,
        period_name: structure.term ? `${structure.term} ${structure.academic_year || ''}` : structure.academic_year,
        published_at: structure.published_at || structure.created_at,
        version_number: structure.version_number || 1,
        status: structure.status || 'Published',
        currency: 'KES',
        mandatory_items: mandatory.map(m => ({
            name: m.name,
            description: m.description,
            category: m.category?.name || 'School Fees',
            billing_frequency: m.billing_frequency,
            due_date: m.due_date || structure.due_date || 'Standard',
            amount: Number(m.amount) || 0
        })),
        optional_items: optional.map(o => ({
            name: o.name,
            description: o.description,
            kind: o.kind,
            amount: Number(o.amount) || 0,
            selection_deadline: o.selection_deadline,
            allows_quantity: o.allows_quantity,
            min_quantity: o.min_quantity,
            max_quantity: o.max_quantity,
            variants: (o.variants || []).map(v => ({
                option_name: v.option_name,
                price: Number(v.price) || 0
            }))
        })),
        payment_methods: (methods || []).map(m => ({
            name: m.name,
            details: m.instructions || m.description || "Remit using student admission number."
        }))
    };
}

/**
 * 3. REUSABLE OPTION CATALOGS (Transport routes, meal plans, trip types)
 */

exports.getOptionCatalogs = async (req, res) => {
    try {
        const { institution_id } = req;
        const { catalog_type } = req.query;

        let query = supabase
            .from('fee_option_catalogs')
            .select('*')
            .eq('institution_id', institution_id)
            .order('display_order', { ascending: true });

        if (catalog_type && catalog_type !== 'all') {
            query = query.eq('catalog_type', catalog_type);
        }

        const { data, error } = await query;
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('getOptionCatalogs error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.createOptionCatalog = async (req, res) => {
    try {
        const { institution_id } = req;
        const { catalog_type, name, code, details = {}, display_order = 0 } = req.body;

        if (!catalog_type || !name?.trim()) {
            return res.status(400).json({ error: "catalog_type and name are required." });
        }

        const { data, error } = await supabase
            .from('fee_option_catalogs')
            .insert([{
                institution_id,
                catalog_type,
                name: name.trim(),
                code: code?.trim() || null,
                details,
                display_order: Number(display_order) || 0,
                is_active: true
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error('createOptionCatalog error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateOptionCatalog = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;
        const { name, code, details, display_order, is_active } = req.body;

        const updateData = { updated_at: new Date().toISOString() };
        if (name) updateData.name = name.trim();
        if (code !== undefined) updateData.code = code?.trim() || null;
        if (details !== undefined) updateData.details = details;
        if (display_order !== undefined) updateData.display_order = Number(display_order);
        if (is_active !== undefined) updateData.is_active = Boolean(is_active);

        const { data, error } = await supabase
            .from('fee_option_catalogs')
            .update(updateData)
            .eq('id', id)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('updateOptionCatalog error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteOptionCatalog = async (req, res) => {
    try {
        const { id } = req.params;
        const { institution_id } = req;

        // Check if any student selections use this catalog
        const { count } = await supabase
            .from('student_optional_selections')
            .select('id', { count: 'exact', head: true })
            .eq('catalog_id', id);

        if (count && count > 0) {
            // Cannot delete, only deactivate
            await supabase
                .from('fee_option_catalogs')
                .update({ is_active: false })
                .eq('id', id)
                .eq('institution_id', institution_id);
            return res.json({ message: "Catalog option is used by students and has been deactivated instead of deleted." });
        }

        const { error } = await supabase
            .from('fee_option_catalogs')
            .delete()
            .eq('id', id)
            .eq('institution_id', institution_id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('deleteOptionCatalog error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.bulkImportCatalogs = async (req, res) => {
    try {
        const { institution_id } = req;
        const { items = [] } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Items array is required for bulk import." });
        }

        const inserted = [];
        for (const item of items) {
            if (!item.name || !item.catalog_type) continue;
            const { data, error } = await supabase
                .from('fee_option_catalogs')
                .insert([{
                    institution_id,
                    catalog_type: item.catalog_type,
                    name: item.name.trim(),
                    code: item.code || null,
                    details: item.details || {},
                    display_order: item.display_order || 0,
                    is_active: true
                }])
                .select()
                .maybeSingle();

            if (!error && data) inserted.push(data);
        }

        res.json({
            success: true,
            imported_count: inserted.length,
            items: inserted
        });
    } catch (err) {
        console.error('bulkImportCatalogs error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * 4. OPTIONAL ITEMS REVIEW QUEUE (Section 4)
 */

// Admin Optional Items Queue: lists students and their optional item statuses
exports.getOptionalItemsQueue = async (req, res) => {
    try {
        const { institution_id } = req;
        const { status, fee_type_id, grade_level, class_id } = req.query;

        // Fetch all active optional fee items
        let ftQuery = supabase
            .from('fee_types')
            .select('id, name, amount, kind, fee_structure_id, fee_structures(level_value, title)')
            .eq('institution_id', institution_id)
            .eq('is_optional', true)
            .eq('status', 'active');

        if (fee_type_id && fee_type_id !== 'all') {
            ftQuery = ftQuery.eq('id', fee_type_id);
        }

        const { data: optionalFeeTypes } = await ftQuery;
        const optFeeIds = (optionalFeeTypes || []).map(f => f.id);

        if (optFeeIds.length === 0) {
            return res.json([]);
        }

        // Fetch recorded selections
        let selQuery = supabase
            .from('student_optional_selections')
            .select(`
                *,
                student:students(
                    id,
                    admission_number,
                    grade_level,
                    form_level,
                    class:classes(id, name),
                    user:users!students_user_id_fkey(full_name, first_name, last_name, phone)
                ),
                fee_type:fee_types(id, name, amount, kind),
                variant:fee_item_variants(id, option_name, price)
            `)
            .eq('institution_id', institution_id)
            .in('fee_type_id', optFeeIds);

        if (status && status !== 'all') {
            selQuery = selQuery.eq('status', status);
        }

        const { data: selections, error } = await selQuery;
        if (error) throw error;

        // Map selections
        const rows = (selections || []).map(s => {
            const studentUser = s.student?.user;
            const stuName = studentUser?.full_name || `${studentUser?.first_name || ''} ${studentUser?.last_name || ''}`.trim() || 'Student';
            return {
                id: s.id,
                student_id: s.student_id,
                student_name: stuName,
                admission_number: s.student?.admission_number || '—',
                grade_level: s.student?.grade_level || s.student?.form_level,
                class_name: s.student?.class?.name || 'Unassigned',
                fee_type_id: s.fee_type_id,
                fee_item_name: s.fee_type?.name,
                kind: s.fee_type?.kind,
                variant_id: s.variant_id,
                variant_name: s.variant?.option_name || 'Standard',
                unit_price: Number(s.unit_price || 0),
                quantity: s.quantity || 1,
                total_price: Number(s.total_price || 0),
                status: s.status,
                opt_out_reason: s.opt_out_reason,
                admin_notes: s.admin_notes,
                selected_at: s.selected_at,
                confirmed_at: s.confirmed_at
            };
        });

        // Apply in-memory class or grade filters if present
        let filtered = rows;
        if (grade_level && grade_level !== 'all') {
            filtered = filtered.filter(r => String(r.grade_level) === String(grade_level));
        }
        if (class_id && class_id !== 'all') {
            filtered = filtered.filter(r => r.class_id === class_id);
        }

        res.json(filtered);
    } catch (err) {
        console.error('getOptionalItemsQueue error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Admin confirms opt-out for a student (no charge)
exports.confirmOptOut = async (req, res) => {
    try {
        const { selectionId } = req.params;
        const { institution_id, userId } = req;
        const { admin_notes, opt_out_reason } = req.body;

        const { data, error } = await supabase
            .from('student_optional_selections')
            .update({
                status: 'opt_out_confirmed',
                confirmed_by: userId,
                confirmed_at: new Date().toISOString(),
                admin_notes: admin_notes?.trim() || null,
                opt_out_reason: opt_out_reason?.trim() || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', selectionId)
            .eq('institution_id', institution_id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, selection: data });
    } catch (err) {
        console.error('confirmOptOut error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Admin marks student as taking an item (creates bill item / selection)
exports.markTakingItem = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const { student_id, fee_type_id, variant_id, quantity = 1, admin_notes } = req.body;

        if (!student_id || !fee_type_id) {
            return res.status(400).json({ error: "student_id and fee_type_id are required." });
        }

        // Get price from variant or fee item
        let unitPrice = 0;
        if (variant_id) {
            const { data: v } = await supabase
                .from('fee_item_variants')
                .select('price')
                .eq('id', variant_id)
                .maybeSingle();
            unitPrice = Number(v?.price) || 0;
        } else {
            const { data: ft } = await supabase
                .from('fee_types')
                .select('amount')
                .eq('id', fee_type_id)
                .maybeSingle();
            unitPrice = Number(ft?.amount) || 0;
        }

        const totalPrice = unitPrice * (Number(quantity) || 1);

        const { data, error } = await supabase
            .from('student_optional_selections')
            .upsert({
                institution_id,
                student_id,
                fee_type_id,
                variant_id: variant_id || null,
                quantity: Number(quantity) || 1,
                unit_price: unitPrice,
                total_price: totalPrice,
                status: 'chosen_not_paid',
                admin_notes: admin_notes?.trim() || null,
                confirmed_by: userId,
                confirmed_at: new Date().toISOString(),
                selected_by: userId,
                selected_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'student_id,fee_type_id' })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, selection: data });
    } catch (err) {
        console.error('markTakingItem error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Bulk action on optional queue
exports.bulkConfirmOptionalItems = async (req, res) => {
    try {
        const { institution_id, userId } = req;
        const { action, selection_ids = [], admin_notes } = req.body;

        if (!action || !selection_ids.length) {
            return res.status(400).json({ error: "action and selection_ids are required." });
        }

        const nowIso = new Date().toISOString();
        let targetStatus = 'opt_out_confirmed';
        if (action === 'mark_taking') targetStatus = 'chosen_not_paid';

        const { data, error } = await supabase
            .from('student_optional_selections')
            .update({
                status: targetStatus,
                confirmed_by: userId,
                confirmed_at: nowIso,
                admin_notes: admin_notes || null,
                updated_at: nowIso
            })
            .in('id', selection_ids)
            .eq('institution_id', institution_id)
            .select();

        if (error) throw error;
        res.json({ success: true, updated_count: data?.length || 0 });
    } catch (err) {
        console.error('bulkConfirmOptionalItems error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Send plain-language reminder to parent regarding unpaid or unselected optional fee
exports.sendOptionalItemReminder = async (req, res) => {
    try {
        const { selectionId } = req.params;
        const { institution_id } = req;

        const { data: selection } = await supabase
            .from('student_optional_selections')
            .select('*, fee_type:fee_types(name), student:students(id, user_id, users:users!students_user_id_fkey(full_name))')
            .eq('id', selectionId)
            .eq('institution_id', institution_id)
            .single();

        if (!selection) return res.status(404).json({ error: "Selection not found" });

        // Find linked parents
        const { data: parents } = await supabase
            .from('parent_students')
            .select('parent:parents(user_id)')
            .eq('student_id', selection.student_id);

        const notifs = (parents || []).filter(p => p.parent?.user_id).map(p => ({
            institution_id,
            user_id: p.parent.user_id,
            title: `Action Needed: ${selection.fee_type?.name} Selection`,
            message: `Please confirm or settle payment for ${selection.fee_type?.name} for ${selection.student?.users?.full_name || 'your child'}.`,
            type: 'optional_fee_reminder',
            reference_id: selection.id,
            reference_type: 'optional_selection',
            created_at: new Date().toISOString()
        }));

        if (notifs.length > 0) {
            await supabase.from('notifications').insert(notifs);
        }

        res.json({ success: true, sent_count: notifs.length });
    } catch (err) {
        console.error('sendOptionalItemReminder error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Operational rosters (e.g. Transport list by route, meal plans, activities)
exports.getOperationalRosters = async (req, res) => {
    try {
        const { institution_id } = req;
        const { catalog_type = 'transport', catalog_id } = req.query;

        let query = supabase
            .from('student_optional_selections')
            .select(`
                id,
                status,
                quantity,
                total_price,
                student:students(
                    id,
                    admission_number,
                    grade_level,
                    class:classes(name),
                    user:users!students_user_id_fkey(full_name, phone)
                ),
                fee_type:fee_types(name),
                variant:fee_item_variants(option_name, option_group, price),
                catalog:fee_option_catalogs(id, name, catalog_type, details)
            `)
            .eq('institution_id', institution_id)
            .in('status', ['chosen_not_paid', 'chosen_pending_confirmation', 'paid']);

        if (catalog_id) {
            query = query.eq('catalog_id', catalog_id);
        }

        const { data: selections, error } = await query;
        if (error) throw error;

        // Group by catalog or variant name
        const groups = {};
        (selections || []).forEach(s => {
            const key = s.catalog?.name || s.variant?.option_name || 'Standard';
            if (!groups[key]) {
                groups[key] = {
                    group_name: key,
                    catalog_details: s.catalog?.details || {},
                    students: []
                };
            }
            groups[key].students.push({
                student_id: s.student?.id,
                admission_number: s.student?.admission_number,
                student_name: s.student?.user?.full_name || 'Student',
                class_name: s.student?.class?.name || 'Unassigned',
                contact_phone: s.student?.user?.phone,
                status: s.status,
                total_price: s.total_price
            });
        });

        res.json(Object.values(groups));
    } catch (err) {
        console.error('getOperationalRosters error:', err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * 5. PARENT EXPERIENCE: FEE STRUCTURE & OPTIONAL CHOICES
 */

// Get child's published fee structure (level & period)
exports.getParentChildFeeStructure = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { institution_id } = req;

        // Get student's grade level
        const { data: student } = await supabase
            .from('students')
            .select('id, grade_level, form_level, admission_number, class_id')
            .eq('id', studentId)
            .eq('institution_id', institution_id)
            .single();

        if (!student) return res.status(404).json({ error: "Student not found" });

        const levelVal = student.grade_level || student.form_level;

        // Find published fee structure for this level
        let fsQuery = supabase
            .from('fee_structures')
            .select(`
                *,
                items:fee_types(
                    *,
                    category:fee_categories(name),
                    variants:fee_item_variants(*)
                )
            `)
            .eq('institution_id', institution_id)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (Number.isFinite(Number(levelVal))) {
            fsQuery = fsQuery.or(`level_value.eq.${levelVal},level_scope.eq.all`);
        }

        const { data: structures } = await fsQuery;
        const structure = structures?.[0] || null;

        if (!structure) {
            return res.json({ structure: null, message: "No published fee structure currently active for your child's grade level." });
        }

        // Fetch parent's existing selections for this child
        const { data: selections } = await supabase
            .from('student_optional_selections')
            .select('*')
            .eq('student_id', studentId)
            .eq('institution_id', institution_id);

        const selectionMap = {};
        (selections || []).forEach(s => {
            selectionMap[s.fee_type_id] = s;
        });

        const items = structure.items || [];
        const mandatory = items.filter(i => !i.is_optional && i.status !== 'archived');
        const optional = items.filter(i => i.is_optional && i.status !== 'archived').map(o => ({
            ...o,
            current_selection: selectionMap[o.id] || null
        }));

        res.json({
            structure,
            mandatory_items: mandatory,
            optional_items: optional,
            selections: selectionMap
        });
    } catch (err) {
        console.error('getParentChildFeeStructure error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Save parent optional fee selections for a child
exports.saveChildOptionalSelections = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { institution_id, userId } = req;
        const { selections = [] } = req.body; // Array of { fee_type_id, variant_id, quantity, opt_out_reason, is_opt_out }

        if (!Array.isArray(selections)) {
            return res.status(400).json({ error: "selections must be an array." });
        }

        const results = [];
        for (const item of selections) {
            if (item.is_opt_out) {
                // Record opt out
                const { data } = await supabase
                    .from('student_optional_selections')
                    .upsert({
                        institution_id,
                        student_id: studentId,
                        fee_type_id: item.fee_type_id,
                        status: 'not_chosen',
                        opt_out_reason: item.opt_out_reason || null,
                        selected_by: userId,
                        selected_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'student_id,fee_type_id' })
                    .select()
                    .single();
                results.push(data);
            } else {
                // Calculate price
                let unitPrice = 0;
                if (item.variant_id) {
                    const { data: v } = await supabase
                        .from('fee_item_variants')
                        .select('price')
                        .eq('id', item.variant_id)
                        .maybeSingle();
                    unitPrice = Number(v?.price) || 0;
                } else {
                    const { data: ft } = await supabase
                        .from('fee_types')
                        .select('amount')
                        .eq('id', item.fee_type_id)
                        .maybeSingle();
                    unitPrice = Number(ft?.amount) || 0;
                }

                const qty = Math.max(1, Number(item.quantity) || 1);
                const totalPrice = unitPrice * qty;

                const { data } = await supabase
                    .from('student_optional_selections')
                    .upsert({
                        institution_id,
                        student_id: studentId,
                        fee_type_id: item.fee_type_id,
                        variant_id: item.variant_id || null,
                        catalog_id: item.catalog_id || null,
                        quantity: qty,
                        unit_price: unitPrice,
                        total_price: totalPrice,
                        status: 'chosen_not_paid',
                        selected_by: userId,
                        selected_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'student_id,fee_type_id' })
                    .select()
                    .single();
                results.push(data);
            }
        }

        res.json({ success: true, saved_count: results.length, selections: results });
    } catch (err) {
        console.error('saveChildOptionalSelections error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Statements: Single Student Statement PDF
exports.getStudentStatementPdf = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { institution_id } = req;

        const payload = await assembleStatementPdfPayload(studentId, institution_id);
        const pdfBuffer = await compilePdfBuffer({ document_type: 'account_statement', data: payload });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="Statement-${payload.admission_number}.pdf"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        return res.end(pdfBuffer);
    } catch (err) {
        console.error('getStudentStatementPdf error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getStudentStatementBase64 = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { institution_id } = req;

        const payload = await assembleStatementPdfPayload(studentId, institution_id);
        const pdfBuffer = await compilePdfBuffer({ document_type: 'account_statement', data: payload });

        res.json({
            base64: pdfBuffer.toString('base64'),
            filename: `Statement-${payload.admission_number || 'Student'}.pdf`
        });
    } catch (err) {
        console.error('getStudentStatementBase64 error:', err);
        res.status(500).json({ error: err.message });
    }
};

async function assembleStatementPdfPayload(studentId, institutionId) {
    const { data: inst } = await supabase
        .from('institutions')
        .select('name, logo_url')
        .eq('id', institutionId)
        .maybeSingle();

    const { data: student } = await supabase
        .from('students')
        .select(`
            id,
            admission_number,
            grade_level,
            class:classes(name),
            user:users!students_user_id_fkey(full_name, first_name, last_name)
        `)
        .eq('id', studentId)
        .eq('institution_id', institutionId)
        .single();

    if (!student) throw new Error("Student not found");

    const summary = await LedgerService.getStudentSummary(studentId, institutionId);

    const { data: ledgerEntries } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('student_id', studentId)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: true });

    const stuName = student.user?.full_name || `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim() || 'Student';

    return {
        institution_name: inst?.name || "Academic Institution",
        student_name: stuName,
        admission_number: student.admission_number || "—",
        class_name: student.class?.name || `Grade ${student.grade_level || '—'}`,
        currency: 'KES',
        summary,
        ledger_entries: ledgerEntries || []
    };
}
