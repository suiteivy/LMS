const supabase = require("../utils/supabaseClient");
const logger = require("../utils/logger");

// Generate a random 8-character temporary password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

exports.login = async (req, res) => {
  const body = req.body;
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    // Use a fresh client to avoid polluting global state
    const { createClient } = require("@supabase/supabase-js");
    const scopedClient = createClient(
      process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, // Use Anon Key for login check
      { auth: { persistSession: false } }
    );

    const { data: authData, error: authError } =
      await scopedClient.auth.signInWithPassword({ email, password });
    if (authError) throw authError;

    const { user } = authData;
    // Use global supabase (Service Role) to fetch user details to verify role etc. without RLS issues?
    // Actually, users table is public read usually? Or RLS protected?
    // Let's use the global supabase client for data fetching as it is reliable (Service Role).
    // The scopedClient was only for auth verification.

    // Check if we need to signOut the scopedClient? No, persistSession: false.

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, role, institution_id, admins!user_id(is_master)")
      .eq("id", user.id)
      .single();

    if (userError) throw userError;

    // Fetch custom ID based on role
    let customId = null;
    if (userData.role === 'student') {
      const { data } = await supabase.from('students').select('id').eq('user_id', user.id).single();
      customId = data?.id;
    } else if (userData.role === 'teacher') {
      const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).single();
      customId = data?.id;
    } else if (userData.role === 'admin') {
      const { data } = await supabase.from('admins').select('id').eq('user_id', user.id).single();
      customId = data?.id;
    } else if (userData.role === 'parent') {
      const { data } = await supabase.from('parents').select('id').eq('user_id', user.id).single();
      customId = data?.id;
    } else if (userData.role === 'bursary') {
      const { data } = await supabase.from('bursars').select('id').eq('user_id', user.id).single();
      customId = data?.id;
    }

    const isMaster = userData.admins?.[0]?.is_master || false;

    // Fetch institution subscription details
    let subscription = null;
    if (userData.institution_id) {
      const { data: instData } = await supabase
        .from('institutions')
        .select('subscription_status, subscription_plan, trial_end_date, has_used_trial')
        .eq('id', userData.institution_id)
        .single();

      if (instData) {
        subscription = {
          status: instData.subscription_status,
          plan: instData.subscription_plan,
          trialEndDate: instData.trial_end_date,
          hasUsedTrial: instData.has_used_trial
        };
      }
    }

    res.status(200).json({
      message: "Login successful",
      token: authData.session.access_token,
      user: {
        uid: user.id,
        email: user.email,
        full_name: userData.full_name,
        role: userData.role,
        institution_id: userData.institution_id,
        isMaster,
        customId,
        subscription
      },
    });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

/**
 * Admin-only endpoint to enroll a new user.
 * Creates auth user, inserts into users table (trigger auto-creates role entry),
 * then updates role-specific table with additional fields and handles assignments.
 */
exports.enrollUser = async (req, res) => {
  const {
    email,
    full_name,
    role,
    phone,
    gender,
    date_of_birth,
    address,
    institution_id,
    // Student-specific
    grade_level,
    academic_year,
    parent_contact,
    emergency_contact_name,
    emergency_contact_phone,
    class_ids, // array of class UUIDs for student enrollment
    parent_info, // Optional: { full_name, email, phone, occupation, address }
    // Teacher-specific
    department,
    qualification,
    specialization,
    position,
    subject_ids, // array of subject UUIDs to assign
    class_teacher_id, // class UUID to assign as class teacher
    // Parent-specific
    occupation,
    parent_address,
    linked_students, // array of { student_id, relationship }
  } = req.body;

  // Validate required fields
  if (!email || !full_name || !role) {
    return res.status(400).json({
      error: "email, full_name, and role are required",
    });
  }

  if (!['admin', 'student', 'teacher', 'parent', 'bursary'].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    // 1. Generate temporary password for primary user
    const tempPassword = generateTempPassword();

    // 2. Create primary auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (authError) throw authError;
    const uid = authData.user.id;

    // 3. Insert into users table
    const targetInstitutionId = institution_id || req.institution_id;
    const { error: userInsertError } = await supabase.from("users").insert({
      id: uid,
      email,
      full_name,
      role,
      phone: phone || null,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      address: address || null,
      institution_id: targetInstitutionId,
    });

    if (userInsertError) throw userInsertError;

    // Small delay for triggers
    await new Promise(resolve => setTimeout(resolve, 500));

    let customId = null;
    let parentResult = null;

    if (role === 'student') {
      const updateFields = {};
      if (grade_level) updateFields.grade_level = grade_level;
      if (academic_year) updateFields.academic_year = academic_year;
      if (parent_contact) updateFields.parent_contact = parent_contact;
      if (emergency_contact_name) updateFields.emergency_contact_name = emergency_contact_name;
      if (emergency_contact_phone) updateFields.emergency_contact_phone = emergency_contact_phone;

      if (Object.keys(updateFields).length > 0) {
        await supabase.from('students').update(updateFields).eq('user_id', uid);
      }

      const { data: studentData } = await supabase
        .from('students').select('id').eq('user_id', uid).single();
      customId = studentData?.id;

      // Class enrollment
      if (class_ids && class_ids.length > 0 && customId) {
        const enrollmentRows = class_ids.map(classId => ({
          student_id: customId,
          class_id: classId,
        }));
        await supabase.from('class_enrollments').insert(enrollmentRows);
      }

      // Optional Atomic Parent Creation
      if (parent_info && parent_info.email && parent_info.full_name) {
        const parentTempPass = generateTempPassword();

        // Create Parent Auth
        const { data: pAuthData, error: pAuthError } = await supabase.auth.admin.createUser({
          email: parent_info.email,
          password: parentTempPass,
          email_confirm: true,
          user_metadata: { full_name: parent_info.full_name },
        });

        if (!pAuthError) {
          const pUid = pAuthData.user.id;

          // Create Parent User
          await supabase.from("users").insert({
            id: pUid,
            email: parent_info.email,
            full_name: parent_info.full_name,
            role: 'parent',
            phone: parent_info.phone || null,
            institution_id: targetInstitutionId,
          });

          await new Promise(resolve => setTimeout(resolve, 500));

          // Update Parent role entry
          await supabase.from('parents').update({
            occupation: parent_info.occupation || null,
            address: parent_info.address || null,
          }).eq('user_id', pUid);

          const { data: pData } = await supabase.from('parents').select('id').eq('user_id', pUid).single();

          if (pData && customId) {
            // Link parent to student
            await supabase.from('parent_students').insert({
              parent_id: pData.id,
              student_id: customId,
              relationship: 'guardian'
            });

            parentResult = {
              email: parent_info.email,
              tempPassword: parentTempPass,
              customId: pData.id,
              full_name: parent_info.full_name
            };
          }
        }
      }
    }

    if (role === 'teacher') {
      const updateFields = {};
      if (department) updateFields.department = department;
      if (qualification) updateFields.qualification = qualification;
      if (specialization) updateFields.specialization = specialization;
      if (position) updateFields.position = position;

      if (Object.keys(updateFields).length > 0) {
        await supabase.from('teachers').update(updateFields).eq('user_id', uid);
      }

      const { data: teacherData } = await supabase
        .from('teachers').select('id').eq('user_id', uid).single();
      customId = teacherData?.id;

      if (subject_ids && subject_ids.length > 0 && customId) {
        for (const subjectId of subject_ids) {
          await supabase.from('subjects').update({ teacher_id: customId }).eq('id', subjectId);
        }
      }

      if (class_teacher_id && customId) {
        await supabase.from('classes').update({ teacher_id: customId }).eq('id', class_teacher_id);
      }
    }

    if (role === 'parent') {
      const updateFields = {};
      if (occupation) updateFields.occupation = occupation;
      if (parent_address) updateFields.address = parent_address;

      if (Object.keys(updateFields).length > 0) {
        await supabase.from('parents').update(updateFields).eq('user_id', uid);
      }

      const { data: parentData } = await supabase
        .from('parents').select('id').eq('user_id', uid).single();
      customId = parentData?.id;

      if (linked_students && linked_students.length > 0 && customId) {
        const linkRows = linked_students.map(ls => ({
          parent_id: customId,
          student_id: ls.student_id,
          relationship: ls.relationship || null,
        }));
        await supabase.from('parent_students').insert(linkRows);
      }
    }

    if (role === 'admin') {
      const { data: adminData } = await supabase
        .from('admins').select('id').eq('user_id', uid).single();
      customId = adminData?.id;
    }

    if (role === 'bursary') {
      const { data: bursarData } = await supabase
        .from('bursars').select('id').eq('user_id', uid).single();
      customId = bursarData?.id;
    }

    res.status(201).json({
      message: "User enrolled successfully",
      uid,
      email,
      tempPassword,
      customId,
      role,
      parentResult // Included if role was student and parent was created
    });
  } catch (err) {
    console.error('Enrollment error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin-only endpoint to update any user's profile.
 * Updates both the users table and the role-specific table.
 */
exports.adminUpdateUser = async (req, res) => {
  const { id } = req.params; // UUID of the user
  const {
    // Users table fields
    full_name,
    email,
    phone,
    gender,
    date_of_birth,
    address,
    institution_id,
    // Student fields
    grade_level,
    academic_year,
    parent_contact,
    emergency_contact_name,
    emergency_contact_phone,
    admission_date,
    // Teacher fields
    department,
    qualification,
    specialization,
    position,
    hire_date,
    // Parent fields
    occupation,
    parent_address,
    avatar_url,
    linked_students, // For parents: Array of custom student IDs
    linked_parents,  // For students: Array of custom parent IDs [NEW]
    class_id,        // For students: UUID of class
    subject_ids,     // For students/teachers: Array of UUIDs
  } = req.body;

  if (!id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // 1. Build users table update
    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (email !== undefined) userUpdates.email = email;
    if (phone !== undefined) userUpdates.phone = phone || null;
    if (gender !== undefined) userUpdates.gender = gender || null;
    if (date_of_birth !== undefined) userUpdates.date_of_birth = date_of_birth || null;
    if (address !== undefined) userUpdates.address = address || null;
    if (institution_id !== undefined) userUpdates.institution_id = institution_id || req.institution_id;
    if (avatar_url !== undefined) userUpdates.avatar_url = avatar_url || null;

    if (Object.keys(userUpdates).length > 0) {
      const { error } = await supabase.from('users').update(userUpdates).eq('id', id);
      if (error) throw error;
    }

    // 2. Get user role to determine which role table to update
    const { data: userData, error: userError } = await supabase
      .from('users').select('role').eq('id', id).single();
    if (userError) throw userError;

    const role = userData.role;

    // 3. Build role-specific update
    if (role === 'student') {
      const updates = {};
      if (grade_level !== undefined) updates.grade_level = grade_level || null;
      if (academic_year !== undefined) updates.academic_year = academic_year || null;
      if (parent_contact !== undefined) updates.parent_contact = parent_contact || null;
      if (emergency_contact_name !== undefined) updates.emergency_contact_name = emergency_contact_name || null;
      if (emergency_contact_phone !== undefined) updates.emergency_contact_phone = emergency_contact_phone || null;
      if (admission_date !== undefined) updates.admission_date = admission_date || null;

      if (Object.keys(updates).length > 0) {
        await supabase.from('students').update(updates).eq('user_id', id);
      }

      // Update class enrollment
      if (class_id !== undefined) {
        // Resolve custom student ID
        const { data: studentData } = await supabase.from('students').select('id').eq('user_id', id).single();
        const customStudentId = studentData?.id;

        if (customStudentId) {
          if (class_id === null) {
            await supabase.from('class_enrollments').delete().eq('student_id', customStudentId);
          } else {
            // Check if already enrolled in a class
            const { data: existing } = await supabase.from('class_enrollments')
              .select('id').eq('student_id', customStudentId).maybeSingle();

            if (existing) {
              await supabase.from('class_enrollments').update({ class_id }).eq('student_id', customStudentId);
            } else {
              await supabase.from('class_enrollments').insert({ student_id: customStudentId, class_id });
            }
          }
        }
      }

      // Link Parents (New Feature)
      if (linked_parents !== undefined) {
        const { data: studentData } = await supabase.from('students').select('id').eq('user_id', id).single();
        const customStudentId = studentData?.id;
        console.log('[AdminUpdate] Linking parents for student:', { customStudentId, linked_parents });

        if (customStudentId) {
          const { error: delErr } = await supabase.from('parent_students').delete().eq('student_id', customStudentId);
          if (delErr) console.error('[AdminUpdate] Delete parent_students (student side) error:', delErr);

          if (linked_parents && linked_parents.length > 0) {
            const inserts = linked_parents.map(pid => ({ parent_id: pid, student_id: customStudentId, relationship: 'guardian' }));
            console.log('[AdminUpdate] Inserting parent_students (student side):', inserts);
            const { error: insErr } = await supabase.from('parent_students').insert(inserts);
            if (insErr) console.error('[AdminUpdate] Insert parent_students (student side) error:', insErr);
            else console.log('[AdminUpdate] Successfully linked parents to student');
          }
        } else {
          console.warn('[AdminUpdate] No student record found for user_id:', id);
        }
      }
    }

    if (role === 'teacher') {
      const updates = {};
      if (department !== undefined) updates.department = department || null;
      if (qualification !== undefined) updates.qualification = qualification || null;
      if (specialization !== undefined) updates.specialization = specialization || null;
      if (position !== undefined) updates.position = position || null;
      if (hire_date !== undefined) updates.hire_date = hire_date || null;

      if (Object.keys(updates).length > 0) {
        await supabase.from('teachers').update(updates).eq('user_id', id);
      }

      // Update subject assignments
      if (subject_ids !== undefined) {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', id).single();
        const customTeacherId = teacherData?.id;

        if (customTeacherId) {
          // Reset old subjects
          await supabase.from('subjects').update({ teacher_id: null }).eq('teacher_id', customTeacherId);
          // Assign new ones
          if (subject_ids && subject_ids.length > 0) {
            await supabase.from('subjects').update({ teacher_id: customTeacherId }).in('id', subject_ids);
          }
        }
      }

      // Update class teacher assignment
      if (req.body.class_teacher_id !== undefined) {
        const { data: teacherData } = await supabase.from('teachers').select('id').eq('user_id', id).single();
        const customTeacherId = teacherData?.id;
        const class_teacher_id = req.body.class_teacher_id;

        if (customTeacherId) {
          // Reset old classes where this teacher was class teacher
          await supabase.from('classes').update({ teacher_id: null }).eq('teacher_id', customTeacherId);
          // Assign new one
          if (class_teacher_id) {
            await supabase.from('classes').update({ teacher_id: customTeacherId }).eq('id', class_teacher_id);
          }
        }
      }
    }

    if (role === 'parent') {
      const updates = {};
      if (occupation !== undefined) updates.occupation = occupation || null;
      if (parent_address !== undefined) updates.address = parent_address || null;

      if (Object.keys(updates).length > 0) {
        await supabase.from('parents').update(updates).eq('user_id', id);
      }

      // Update linked students
      if (linked_students !== undefined) {
        const { data: parentData } = await supabase.from('parents').select('id').eq('user_id', id).single();
        const customParentId = parentData?.id;
        console.log('[AdminUpdate] Linking students for parent:', { customParentId, linked_students });

        if (customParentId) {
          // Simple sync: delete all and re-insert
          const { error: delErr } = await supabase.from('parent_students').delete().eq('parent_id', customParentId);
          if (delErr) console.error('[AdminUpdate] Delete parent_students error:', delErr);

          if (linked_students && linked_students.length > 0) {
            const inserts = linked_students.map(sid => ({ parent_id: customParentId, student_id: sid, relationship: 'guardian' }));
            console.log('[AdminUpdate] Inserting parent_students:', inserts);
            const { error: insErr } = await supabase.from('parent_students').insert(inserts);
            if (insErr) console.error('[AdminUpdate] Insert parent_students error:', insErr);
          }
        } else {
          console.warn('[AdminUpdate] No parent record found for user_id:', id);
        }
      }
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error('Admin update error:', err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE USER (Admin only)
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    // 1. Delete from Supabase Auth (requires service role key)
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      console.error('Auth deletion error:', authError);
      // If auth user not found, we might still want to try deleting from public.users
      if (authError.status !== 404) {
        return res.status(500).json({ error: authError.message });
      }
    }

    // 2. Delete from public.users (Cascades to admins, teachers, students, parents)
    const { error: dbError } = await supabase.from('users').delete().eq('id', id);

    if (dbError) {
      console.error('DB deletion error:', dbError);
      return res.status(500).json({ error: dbError.message });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ error: "Server error during deletion" });
  }
};

/**
 * Search users by name or role
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q, role } = req.query;
    let query = supabase
      .from("users")
      .select("id, full_name, email, role, avatar_url");

    if (q) {
      query = query.ilike("full_name", `%${q}%`);
    }

    if (role) {
      query = query.eq("role", role);
    }

    const { data, error } = await query.limit(10);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Handle logout to clean up trial sessions
 */
exports.logout = async (req, res) => {
  try {
    const user = req.user;
    if (user) {
      // Clean up trial session for this user if it exists
      const { error } = await supabase
        .from('trial_sessions')
        .delete()
        .eq('demo_user_id', user.id);

      if (error) {
        console.warn("Error cleaning up trial session:", error);
      } else {
        console.log(`Trial session cleaned up for user ${user.id}`);
      }
    }
    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout error" });
  }
};

/**
 * Change password for authenticated user
 * Requires current_password and new_password in body
 */
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.userId;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    // Verify current password by attempting sign-in
    const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
    if (!userData) return res.status(404).json({ error: "User not found" });

    const { createClient } = require("@supabase/supabase-js");
    const scopedClient = createClient(
      process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { error: signInError } = await scopedClient.auth.signInWithPassword({
      email: userData.email,
      password: current_password,
    });

    if (signInError) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Update password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password,
    });

    if (updateError) throw updateError;

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    res.status(500).json({ error: err.message || "Failed to change password" });
  }
};

/**
 * Send password reset email (public endpoint)
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const { createClient } = require("@supabase/supabase-js");
    const scopedClient = createClient(
      process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { error } = await scopedClient.auth.resetPasswordForEmail(email, {
      redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL || undefined,
    });

    if (error) throw error;

    // Always return success to not leak whether email exists
    res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
  } catch (err) {
    console.error("forgotPassword error:", err);
    // Still return 200 to not leak info
    res.status(200).json({ message: "If an account with that email exists, a reset link has been sent." });
  }
};

/**
 * Reset password using access token from reset email
 */
exports.resetPassword = async (req, res) => {
  try {
    const { access_token, new_password } = req.body;

    if (!access_token || !new_password) {
      return res.status(400).json({ error: "Access token and new password are required" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Get user from the access token
    const { createClient } = require("@supabase/supabase-js");
    const scopedClient = createClient(
      process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data: { user }, error: getUserError } = await scopedClient.auth.getUser(access_token);
    if (getUserError || !user) {
      return res.status(401).json({ error: "Invalid or expired reset token" });
    }

    // Update password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) throw updateError;

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ error: err.message || "Failed to reset password" });
  }
};

/**
 * Transfer Master Admin status to another administrator in the same institution.
 * Only current Master Admin can perform this.
 */
exports.transferMasterAdmin = async (req, res) => {
  try {
    const { targetAdminUserId } = req.body;
    const currentUserId = req.userId;

    if (!targetAdminUserId) {
      return res.status(400).json({ error: "Recipient admin user ID is required" });
    }

    const { error } = await supabase.rpc('transfer_master_status', {
      p_old_admin_user_id: currentUserId,
      p_new_admin_user_id: targetAdminUserId
    });

    if (error) throw error;

    res.json({ message: "Master Admin status transferred successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
