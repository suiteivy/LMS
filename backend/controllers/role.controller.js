const supabase = require("../utils/supabaseClient.js");
const { logAuditEvent } = require("../utils/auditLogger.js");

const RESERVED_ROLE_NAMES = new Set([
  'admin',
  'master_admin',
  'platform_admin',
  'main_admin',
  'owner',
  'superadmin'
]);

// Helper to check if requester is Main Admin or Master Admin
function isMainOrMasterAdmin(req) {
  return !!(
    req.user?.is_main ||
    req.isMain ||
    req.user?.role === 'master_admin' ||
    req.isPlatformAdmin ||
    req.user?.is_platform_admin
  );
}

// Helper to check if requester can manage roles (either Main Admin or holds roles_access:manage_roles)
async function canManageRoles(req) {
  if (isMainOrMasterAdmin(req)) return true;
  const userId = req.user?.id || req.userId;
  const institutionId = req.institution_id;
  if (!userId || !institutionId) return false;

  try {
    const { data: hasPerm } = await supabase.rpc('has_permission', {
      p_user_id: userId,
      p_institution_id: institutionId,
      p_domain: 'roles_access',
      p_action: 'manage_roles'
    });
    return !!hasPerm;
  } catch (err) {
    console.warn('[RoleController] canManageRoles check warning:', err);
    return false;
  }
}

// GET ALL ROLES FOR INSTITUTION (including permissions & scopes)
exports.getRoles = async (req, res) => {
  const { institution_id } = req;
  try {
    const { data: roles, error } = await supabase
      .from("roles")
      .select(`
        *,
        role_permissions (
          id,
          domain,
          action,
          permissions (
            id,
            name,
            description,
            category
          )
        ),
        role_scopes (
          id,
          domain,
          scope_type,
          scope_values,
          hidden_fields
        )
      `)
      .eq("institution_id", institution_id)
      .order("name");

    if (error) throw error;

    const formatted = (roles || []).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      data_scope: r.data_scope || 'all',
      metadata: r.metadata || {},
      isDefault: ['admin', 'teacher', 'student', 'parent', 'bursar', 'librarian'].includes(r.name.toLowerCase()),
      permissions: (r.role_permissions || []).map(rp => ({
        domain: rp.domain || (rp.permissions ? rp.permissions.name.split(':')[0] : null),
        action: rp.action || (rp.permissions ? rp.permissions.name.split(':')[1] : null),
        legacyName: rp.permissions?.name || null,
        description: rp.permissions?.description || null
      })),
      scopes: r.role_scopes || []
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getRoles error:", err);
    res.status(500).json({ error: "Failed to retrieve roles" });
  }
};

// GET ALL SYSTEM PERMISSIONS (Legacy & Compatibility)
exports.getPermissions = async (req, res) => {
  try {
    const { data: permissions, error } = await supabase
      .from("permissions")
      .select("*")
      .order("category");

    if (error) throw error;
    res.json(permissions || []);
  } catch (err) {
    console.error("getPermissions error:", err);
    res.status(500).json({ error: "Failed to retrieve permissions" });
  }
};

// GET READY-MADE ROLE TEMPLATES
exports.getTemplates = async (req, res) => {
  const { institution_id } = req;
  try {
    const { data: templates, error } = await supabase
      .from("role_templates")
      .select("*")
      .or(`institution_id.is.null,institution_id.eq.${institution_id}`)
      .order("name");

    if (error) throw error;
    res.json(templates || []);
  } catch (err) {
    console.error("getTemplates error:", err);
    res.status(500).json({ error: "Failed to retrieve role templates" });
  }
};

// GET FEATURE REGISTRY (Domains & Actions)
exports.getFeatures = async (req, res) => {
  try {
    const { data: features, error } = await supabase
      .from("feature_registry")
      .select("*")
      .order("domain")
      .order("action");

    if (error) throw error;
    res.json(features || []);
  } catch (err) {
    console.error("getFeatures error:", err);
    res.status(500).json({ error: "Failed to retrieve feature registry" });
  }
};

// GET PLAIN-LANGUAGE GUIDANCE & HELP CONTENT
exports.getHelpContent = async (req, res) => {
  const { language = 'en' } = req.query;
  const { institution_id } = req;
  try {
    const { data: content, error } = await supabase
      .from("help_content")
      .select("*")
      .eq("language", language)
      .or(`institution_id.is.null,institution_id.eq.${institution_id}`);

    if (error) throw error;
    res.json(content || []);
  } catch (err) {
    console.error("getHelpContent error:", err);
    res.status(500).json({ error: "Failed to retrieve help content" });
  }
};

// GET SYSTEM ACTIVITY AUDIT LOGS FOR ROLES & ACCESS
exports.getAuditLogs = async (req, res) => {
  const { institution_id } = req;
  const limit = parseInt(req.query.limit || '50', 10);
  const offset = parseInt(req.query.offset || '0', 10);

  const canViewAudit = await canManageRoles(req);
  if (!canViewAudit) {
    return res.status(403).json({ error: "Only authorized administrators can inspect activity history." });
  }

  try {
    const { data: logs, count, error } = await supabase
      .from("audit_logs")
      .select(`
        *,
        actor:users!audit_logs_actor_id_fkey(id, full_name, email, role)
      `, { count: 'exact' })
      .eq("institution_id", institution_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ logs: logs || [], total: count || 0 });
  } catch (err) {
    console.error("getAuditLogs error:", err);
    res.status(500).json({ error: "Failed to retrieve activity history" });
  }
};

// GET EFFECTIVE PERMISSIONS & SCOPES FOR A USER
exports.getEffectivePermissions = async (req, res) => {
  const { userId } = req.params;
  const { institution_id } = req;

  try {
    const [permsRes, scopesRes] = await Promise.all([
      supabase.rpc('get_effective_permissions', {
        p_user_id: userId,
        p_institution_id: institution_id
      }),
      supabase.rpc('get_effective_scopes', {
        p_user_id: userId,
        p_institution_id: institution_id
      })
    ]);

    if (permsRes.error) throw permsRes.error;
    if (scopesRes.error) throw scopesRes.error;

    res.json({
      permissions: permsRes.data || {},
      scopes: scopesRes.data || { is_unrestricted: false, domains: {} }
    });
  } catch (err) {
    console.error("getEffectivePermissions error:", err);
    res.status(500).json({ error: "Failed to resolve effective permissions" });
  }
};

// CREATE CUSTOM ROLE (domains x actions, scopes, audit)
exports.createRole = async (req, res) => {
  const { name, description, permissions, permission_names, scopes, data_scope, metadata, created_from_template_id } = req.body;
  const { institution_id } = req;
  const actorId = req.user?.id || req.userId;

  if (!isMainOrMasterAdmin(req)) {
    return res.status(403).json({ error: "Only the Main Administrator or Platform Admin can create custom roles." });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Role name is required" });
  }

  const trimmedName = name.trim();
  if (RESERVED_ROLE_NAMES.has(trimmedName.toLowerCase())) {
    return res.status(400).json({ error: `The role name "${trimmedName}" is reserved for system administration.` });
  }

  if (data_scope && !['all', 'levels', 'classes'].includes(data_scope)) {
    return res.status(400).json({ error: 'Invalid data_scope. Must be one of: all, levels, classes.' });
  }

  try {
    // 1. Create role in roles table
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        name: trimmedName,
        description: description || null,
        data_scope: data_scope || 'all',
        metadata: metadata || {},
        institution_id,
        created_from_template_id: created_from_template_id || null
      })
      .select()
      .single();

    if (roleError) {
      if (roleError.code === "23505") {
        return res.status(400).json({ error: "A role with this name already exists in this institution" });
      }
      throw roleError;
    }

    // 2. Insert role_permissions if provided
    if (Array.isArray(permissions) && permissions.length > 0) {
      const rpRows = permissions.map(p => ({
        role_id: role.id,
        institution_id,
        domain: p.domain,
        action: p.action
      }));

      const { error: rpError } = await supabase
        .from("role_permissions")
        .insert(rpRows);

      if (rpError) throw rpError;
    }

    // 3. Insert role_scopes if provided
    if (Array.isArray(scopes) && scopes.length > 0) {
      const rsRows = scopes.map(s => ({
        role_id: role.id,
        institution_id,
        domain: s.domain,
        scope_type: s.scope_type || 'all',
        scope_values: s.scope_values || [],
        hidden_fields: s.hidden_fields || []
      }));

      const { error: rsError } = await supabase
        .from("role_scopes")
        .insert(rsRows);

      if (rsError) throw rsError;
    }

    // Log Activity History
    await logAuditEvent({
      institution_id,
      actor_id: actorId,
      action: 'create_role',
      domain: 'roles_access',
      target_type: 'role',
      target_id: role.id,
      after_state: { name: trimmedName, description, permissions_count: permissions?.length || 0 }
    });

    res.status(201).json({ message: "Role created successfully", role });
  } catch (err) {
    console.error("createRole error:", err);
    res.status(500).json({ error: err.message || "Failed to create role" });
  }
};

// UPDATE CUSTOM ROLE & PERMISSIONS
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description, permissions, scopes, data_scope, metadata } = req.body;
  const { institution_id } = req;
  const actorId = req.user?.id || req.userId;

  const allowed = await canManageRoles(req);
  if (!allowed) {
    return res.status(403).json({ error: "Only administrators with role management authority can modify custom roles." });
  }

  try {
    const { data: role, error: fetchErr } = await supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (fetchErr || !role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const isDefault = ['admin', 'teacher', 'student', 'parent', 'bursar', 'librarian'].includes(role.name.toLowerCase());
    if (isDefault) {
      return res.status(403).json({ error: "System default roles cannot be edited or updated" });
    }

    if (name && RESERVED_ROLE_NAMES.has(name.trim().toLowerCase())) {
      return res.status(400).json({ error: `The role name "${name.trim()}" is reserved for system administration.` });
    }

    // 1. Update role core record
    const { error: updateErr } = await supabase
      .from("roles")
      .update({
        name: name ? name.trim() : role.name,
        description: description !== undefined ? description : role.description,
        data_scope: data_scope !== undefined ? data_scope : role.data_scope,
        metadata: metadata !== undefined ? metadata : role.metadata,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // 2. Update permissions if provided
    if (Array.isArray(permissions)) {
      await supabase.from("role_permissions").delete().eq("role_id", id);
      if (permissions.length > 0) {
        const rpRows = permissions.map(p => ({
          role_id: id,
          institution_id,
          domain: p.domain,
          action: p.action
        }));
        await supabase.from("role_permissions").insert(rpRows);
      }
    }

    // 3. Update scopes if provided
    if (Array.isArray(scopes)) {
      await supabase.from("role_scopes").delete().eq("role_id", id);
      if (scopes.length > 0) {
        const rsRows = scopes.map(s => ({
          role_id: id,
          institution_id,
          domain: s.domain,
          scope_type: s.scope_type || 'all',
          scope_values: s.scope_values || [],
          hidden_fields: s.hidden_fields || []
        }));
        await supabase.from("role_scopes").insert(rsRows);
      }
    }

    // Log Activity History
    await logAuditEvent({
      institution_id,
      actor_id: actorId,
      action: 'update_role',
      domain: 'roles_access',
      target_type: 'role',
      target_id: id,
      before_state: { name: role.name, description: role.description },
      after_state: { name: name || role.name, description: description !== undefined ? description : role.description }
    });

    res.json({ message: "Role updated successfully" });
  } catch (err) {
    console.error("updateRole error:", err);
    res.status(500).json({ error: err.message || "Failed to update role" });
  }
};

// DELETE CUSTOM ROLE
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  const { institution_id } = req;
  const actorId = req.user?.id || req.userId;

  if (!isMainOrMasterAdmin(req)) {
    return res.status(403).json({ error: "Only the Main Administrator or Platform Admin can delete custom roles." });
  }

  try {
    const { data: role, error: fetchErr } = await supabase
      .from("roles")
      .select("*")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (fetchErr || !role) {
      return res.status(404).json({ error: "Role not found" });
    }

    const isDefault = ['admin', 'teacher', 'student', 'parent', 'bursar', 'librarian'].includes(role.name.toLowerCase());
    if (isDefault) {
      return res.status(403).json({ error: "System default roles cannot be deleted" });
    }

    // Check if any active users hold this role
    const { count: assignedCount, error: countErr } = await supabase
      .from("user_roles")
      .select("*", { count: 'exact', head: true })
      .eq("role_id", id)
      .eq("status", "active");

    if (countErr) throw countErr;

    if (assignedCount && assignedCount > 0) {
      return res.status(400).json({
        error: `Cannot delete role "${role.name}" because it is currently assigned to ${assignedCount} user${assignedCount > 1 ? 's' : ''}. Please reassign these users before deleting this role.`,
        code: 'ROLE_IN_USE',
        assignedCount,
      });
    }

    // Delete role permissions, scopes, and role
    await Promise.all([
      supabase.from("role_permissions").delete().eq("role_id", id),
      supabase.from("role_scopes").delete().eq("role_id", id),
      supabase.from("roles").delete().eq("id", id)
    ]);

    // Log Activity History
    await logAuditEvent({
      institution_id,
      actor_id: actorId,
      action: 'delete_role',
      domain: 'roles_access',
      target_type: 'role',
      target_id: id,
      before_state: { name: role.name }
    });

    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error("deleteRole error:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
};

// ASSIGN MULTI-ROLES TO USER (with delegation ceiling and invariant guards)
exports.assignUserRoles = async (req, res) => {
  const { userId, role_ids, starts_at, expires_at } = req.body;
  const { institution_id } = req;
  const actorId = req.user?.id || req.userId;

  const allowed = await canManageRoles(req);
  if (!allowed) {
    return res.status(403).json({ error: "You do not have permission to give access to other users." });
  }

  // Invariant: Nobody can edit their own roles or scope
  if (actorId && actorId === userId) {
    return res.status(403).json({ error: "Security restriction: You cannot assign or modify your own job roles." });
  }

  if (!userId || !Array.isArray(role_ids)) {
    return res.status(400).json({ error: "userId and role_ids array are required" });
  }

  try {
    // Verify target user belongs to same institution
    const { data: targetUser } = await supabase
      .from("users")
      .select("id, role, full_name, email")
      .eq("id", userId)
      .eq("institution_id", institution_id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: "User not found in your institution" });
    }

    // Invariant: Teachers hold no administrative roles or access (except Librarian designation)
    if (targetUser.role === 'teacher') {
      const { data: assignedRoles } = await supabase
        .from("roles")
        .select("id, name")
        .in("id", role_ids);

      const nonLibrarianRoles = (assignedRoles || []).filter(r => r.name.toLowerCase() !== 'librarian');
      if (nonLibrarianRoles.length > 0) {
        return res.status(400).json({
          error: "Teachers cannot hold administrative roles or access. They can only be assigned the Librarian extra duty."
        });
      }
    }

    // Delegation ceiling check:
    // Non-main admins can only grant permissions they themselves hold
    if (!isMainOrMasterAdmin(req) && role_ids.length > 0) {
      const [actorPermsRes, targetRolesPermsRes] = await Promise.all([
        supabase.rpc('get_effective_permissions', {
          p_user_id: actorId,
          p_institution_id: institution_id
        }),
        supabase
          .from("role_permissions")
          .select("domain, action")
          .in("role_id", role_ids)
      ]);

      const actorPerms = actorPermsRes.data || {};
      const targetRolePerms = targetRolesPermsRes.data || [];

      for (const p of targetRolePerms) {
        if (!actorPerms[p.domain] || !actorPerms[p.domain][p.action]?.granted) {
          return res.status(403).json({
            error: `Delegation ceiling: You can only give access you have yourself. You lack the "${p.action}" action on "${p.domain}".`
          });
        }
      }
    }

    // Get before state for audit log
    const { data: beforeRoles } = await supabase
      .from("user_roles")
      .select("role_id, roles(name)")
      .eq("user_id", userId);

    // 1. Clear existing role assignments
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // 2. Insert new user_roles assignments
    if (role_ids.length > 0) {
      const urRows = role_ids.map(rid => ({
        user_id: userId,
        role_id: rid,
        institution_id,
        assigned_by: actorId,
        starts_at: starts_at || new Date().toISOString(),
        expires_at: expires_at || null,
        status: 'active'
      }));

      const { error: assignError } = await supabase
        .from("user_roles")
        .insert(urRows);

      if (assignError) throw assignError;
    }

    // Log Activity History
    await logAuditEvent({
      institution_id,
      actor_id: actorId,
      action: 'assign_roles',
      domain: 'roles_access',
      target_type: 'user',
      target_id: userId,
      before_state: { roles: (beforeRoles || []).map(r => r.roles?.name).filter(Boolean) },
      after_state: { role_ids, starts_at, expires_at }
    });

    res.json({ message: "Job roles assigned successfully" });
  } catch (err) {
    console.error("assignUserRoles error:", err);
    res.status(500).json({ error: err.message || "Failed to assign user roles" });
  }
};

// GET USER ASSIGNED ROLES
exports.getUserRoles = async (req, res) => {
  const { userId } = req.params;
  const { institution_id } = req;

  try {
    const { data: userRoles, error } = await supabase
      .from("user_roles")
      .select(`
        id,
        role_id,
        starts_at,
        expires_at,
        status,
        roles (
          id,
          name,
          description,
          data_scope,
          metadata
        )
      `)
      .eq("user_id", userId)
      .eq("institution_id", institution_id);

    if (error) throw error;

    const formatted = (userRoles || [])
      .filter(ur => ur.roles)
      .map(ur => ({
        assignment_id: ur.id,
        id: ur.roles.id,
        name: ur.roles.name,
        description: ur.roles.description,
        data_scope: ur.roles.data_scope || 'all',
        metadata: ur.roles.metadata || {},
        starts_at: ur.starts_at,
        expires_at: ur.expires_at,
        status: ur.status
      }));

    res.json(formatted);
  } catch (err) {
    console.error("getUserRoles error:", err);
    res.status(500).json({ error: "Failed to retrieve user roles" });
  }
};

// SET ACCOUNT-LEVEL EXPLICIT PERMISSION OVERRIDE (Allow or Deny - Main Admin Only)
exports.setPermissionOverride = async (req, res) => {
  const { userId, domain, action, effect, reason } = req.body;
  const { institution_id } = req;
  const actorId = req.user?.id || req.userId;

  if (!isMainOrMasterAdmin(req)) {
    return res.status(403).json({ error: "Only the Main Administrator can set explicit access blocks or overrides." });
  }

  if (!userId || !domain || !action || !['allow', 'deny'].includes(effect)) {
    return res.status(400).json({ error: "userId, domain, action, and valid effect ('allow' | 'deny') are required." });
  }

  try {
    const { data: override, error } = await supabase
      .from("user_permission_overrides")
      .upsert({
        institution_id,
        user_id: userId,
        domain,
        action,
        effect,
        granted_by: actorId,
        reason: reason || null
      }, { onConflict: 'user_id,domain,action' })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      institution_id,
      actor_id: actorId,
      action: effect === 'deny' ? 'block_access' : 'allow_access_override',
      domain: 'roles_access',
      target_type: 'user',
      target_id: userId,
      after_state: { domain, action, effect, reason }
    });

    res.json({ message: `Access override (${effect}) applied successfully`, override });
  } catch (err) {
    console.error("setPermissionOverride error:", err);
    res.status(500).json({ error: err.message || "Failed to set permission override" });
  }
};

// DELETE PERMISSION OVERRIDE
exports.deletePermissionOverride = async (req, res) => {
  const { overrideId } = req.params;
  const { institution_id } = req;
  const actorId = req.user?.id || req.userId;

  if (!isMainOrMasterAdmin(req)) {
    return res.status(403).json({ error: "Only the Main Administrator can remove access overrides." });
  }

  try {
    const { error } = await supabase
      .from("user_permission_overrides")
      .delete()
      .eq("id", overrideId)
      .eq("institution_id", institution_id);

    if (error) throw error;

    await logAuditEvent({
      institution_id,
      actor_id: actorId,
      action: 'remove_access_override',
      domain: 'roles_access',
      target_type: 'permission_override',
      target_id: overrideId
    });

    res.json({ message: "Access override removed successfully" });
  } catch (err) {
    console.error("deletePermissionOverride error:", err);
    res.status(500).json({ error: "Failed to remove permission override" });
  }
};
