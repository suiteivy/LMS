const supabase = require("../utils/supabaseClient.js");

// GET ALL ROLES FOR INSTITUTION
exports.getRoles = async (req, res) => {
  const { institution_id } = req;
  try {
    const { data: roles, error } = await supabase
      .from("roles")
      .select(`
        *,
        role_permissions (
          permissions (
            id,
            name,
            description,
            category
          )
        )
      `)
      .eq("institution_id", institution_id)
      .order("name");

    if (error) throw error;

    // Format roles output for API consumption
    const formatted = roles.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isDefault: ['admin', 'teacher', 'student', 'parent', 'bursar', 'librarian'].includes(r.name.toLowerCase()),
      permissions: r.role_permissions
        ? r.role_permissions.filter(rp => rp.permissions).map(rp => rp.permissions.name)
        : []
    }));

    res.json(formatted);
  } catch (err) {
    console.error("getRoles error:", err);
    res.status(500).json({ error: "Failed to retrieve roles" });
  }
};

// GET ALL SYSTEM PERMISSIONS
exports.getPermissions = async (req, res) => {
  try {
    const { data: permissions, error } = await supabase
      .from("permissions")
      .select("*")
      .order("category");

    if (error) throw error;
    res.json(permissions);
  } catch (err) {
    console.error("getPermissions error:", err);
    res.status(500).json({ error: "Failed to retrieve permissions" });
  }
};

// CREATE CUSTOM ROLE
exports.createRole = async (req, res) => {
  const { name, description, permission_names } = req.body;
  const { institution_id } = req;

  if (!name) {
    return res.status(400).json({ error: "Role name is required" });
  }

  try {
    // 1. Create role
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .insert({
        name,
        description,
        institution_id
      })
      .select()
      .single();

    if (roleError) {
      if (roleError.code === "23505") {
        return res.status(400).json({ error: "A role with this name already exists in this institution" });
      }
      throw roleError;
    }

    // 2. Link permissions if provided
    if (permission_names && permission_names.length > 0) {
      // Find permission IDs by name
      const { data: perms } = await supabase
        .from("permissions")
        .select("id, name")
        .in("name", permission_names);

      if (perms && perms.length > 0) {
        const rpRows = perms.map(p => ({
          role_id: role.id,
          permission_id: p.id
        }));

        const { error: linkError } = await supabase
          .from("role_permissions")
          .insert(rpRows);

        if (linkError) throw linkError;
      }
    }

    res.status(201).json({ message: "Role created successfully", role });
  } catch (err) {
    console.error("createRole error:", err);
    res.status(500).json({ error: err.message || "Failed to create role" });
  }
};

// UPDATE CUSTOM ROLE & PERMISSIONS
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description, permission_names } = req.body;
  const { institution_id } = req;

  try {
    // Verify role belongs to institution and is not system restricted
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

    // 1. Update role metadata
    const { error: updateErr } = await supabase
      .from("roles")
      .update({
        name: name || role.name,
        description: description !== undefined ? description : role.description,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);

    if (updateErr) throw updateErr;

    // 2. Update permissions
    if (permission_names !== undefined) {
      // Clear existing mappings
      await supabase.from("role_permissions").delete().eq("role_id", id);

      if (permission_names.length > 0) {
        const { data: perms } = await supabase
          .from("permissions")
          .select("id")
          .in("name", permission_names);

        if (perms && perms.length > 0) {
          const rpRows = perms.map(p => ({
            role_id: id,
            permission_id: p.id
          }));

          const { error: linkError } = await supabase
            .from("role_permissions")
            .insert(rpRows);

          if (linkError) throw linkError;
        }
      }
    }

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

    const { error: deleteErr } = await supabase
      .from("roles")
      .delete()
      .eq("id", id);

    if (deleteErr) throw deleteErr;

    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    console.error("deleteRole error:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
};

// ASSIGN ROLES TO USER
exports.assignUserRoles = async (req, res) => {
  const { userId, role_ids } = req.body;
  const { institution_id } = req;

  if (!userId || !role_ids) {
    return res.status(400).json({ error: "userId and role_ids are required" });
  }

  try {
    // Verify target user is in same institution
    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .eq("institution_id", institution_id)
      .single();

    if (!targetUser) {
      return res.status(404).json({ error: "User not found in your institution" });
    }

    // Verify all role_ids belong to the institution
    const { data: roles } = await supabase
      .from("roles")
      .select("id")
      .in("id", role_ids)
      .eq("institution_id", institution_id);

    if (!roles || roles.length !== role_ids.length) {
      return res.status(400).json({ error: "One or more invalid role IDs specified" });
    }

    // 1. Clear existing user role assignments
    await supabase.from("user_roles").delete().eq("user_id", userId);

    // 2. Insert new user role assignments
    if (role_ids.length > 0) {
      const urRows = role_ids.map(rid => ({
        user_id: userId,
        role_id: rid
      }));

      const { error: assignError } = await supabase
        .from("user_roles")
        .insert(urRows);

      if (assignError) throw assignError;
    }

    res.json({ message: "Roles assigned successfully" });
  } catch (err) {
    console.error("assignUserRoles error:", err);
    res.status(500).json({ error: "Failed to assign user roles" });
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
        role_id,
        roles (
          id,
          name,
          description
        )
      `)
      .eq("user_id", userId)
      .eq("roles.institution_id", institution_id);

    if (error) throw error;

    const formatted = userRoles
      .filter(ur => ur.roles)
      .map(ur => ({
        id: ur.roles.id,
        name: ur.roles.name,
        description: ur.roles.description
      }));

    res.json(formatted);
  } catch (err) {
    console.error("getUserRoles error:", err);
    res.status(500).json({ error: "Failed to retrieve user roles" });
  }
};
