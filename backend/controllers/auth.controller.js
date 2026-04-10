import process from "node:process";
const supabase = require("../utils/supabaseClient.js");
const { sendEmail } = require("../utils/emailService.js");

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
      .select("first_name, last_name, full_name, role, institution_id, admins!user_id(is_main)")
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

    const isMain = userData.admins?.[0]?.is_main || false;

    // Check if this is a platform admin (dedicated role or matching registry)
    let isPlatformAdmin = userData.role === 'master_admin';
    if (!isPlatformAdmin && userData.role === 'admin' && !userData.institution_id) {
      const { data: platAdmin } = await supabase
        .from("platform_admins")
        .select("id")
        .eq("id", user.id)
        .single();

      if (platAdmin) {
        isPlatformAdmin = true;
      }
    }

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

    // For actual users, we increase the expiry to 24 hours
    const expiresIn = 24 * 60 * 60; // 86400 seconds

    res.status(200).json({
      message: "Login successful",
      token: authData.session.access_token,
      expiresIn,
      user: {
        uid: user.id,
        email: user.email,
        full_name: userData.full_name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        institution_id: userData.institution_id,
        isMain,
        isPlatformAdmin,
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
    email, // This might be overridden for custom domains
    full_name, // fallback for legacy
    first_name,
    last_name,
    phone,
    role,
    gender,
    address,
    date_of_birth,
    institution_id,
    // Role-specific fields
    grade_level,
    academic_year,
    parent_contact,
    emergency_contact_name,
    emergency_contact_phone,
    class_ids, // array of class UUIDs for student enrollment
    parent_info, // Optional: { first_name, last_name, email, phone, occupation, address }
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

  // Derive first/last from full_name if provided and first_name is missing
  let fName = first_name;
  let lName = last_name;
  if (!fName && full_name) {
    const parts = full_name.trim().split(/\s+/);
    fName = parts[0];
    lName = parts.slice(1).join(' ');
  }

  const finalFullName = `${fName} ${lName}`.trim();

  // Validate required fields
  if (!fName || !role) {
    return res.status(400).json({
      error: "first_name and role are required",
    });
  }

  if (!['admin', 'student', 'teacher', 'parent', 'bursary'].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const targetInstitutionId = institution_id || req.institution_id;

    // 0. Enforce Limits
    if (targetInstitutionId) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('subscription_plan, email_domain')
        .eq('id', targetInstitutionId)
        .single();

      const _institutionDomain = inst?.email_domain;

      // Normalise legacy IDs to canonical plan IDs
      const rawPlan = inst?.subscription_plan || 'trial';
      const normPlan = (p) => {
        const mapping = {
          beta_free: 'beta',
          basic_basic: 'basic',
          basic_pro: 'pro',
          basic_premium: 'premium',
          enterprise_basic: 'custom',
          enterprise_pro: 'custom',
          enterprise_premium: 'custom',
          custom_basic: 'custom',
          custom_pro: 'custom',
          custom_premium: 'custom'
        };
        return mapping[p] || p || 'trial';
      };
      const canonicalPlan = normPlan(rawPlan);

      // Limits aligned with landing page promises
      const LIMITS = {
        beta: { maxStudents: 30, maxAdmins: 1 },
        trial: { maxStudents: 50, maxAdmins: 1 },
        basic: { maxStudents: 900, maxAdmins: 1 },
        pro: { maxStudents: 1000, maxAdmins: 3 },
        premium: { maxStudents: 5000, maxAdmins: Infinity },
        custom: { maxStudents: Infinity, maxAdmins: Infinity },
      };

      const limits = LIMITS[canonicalPlan] ?? { maxStudents: 50, maxAdmins: 1 };

      if (role === 'admin' && limits.maxAdmins !== Infinity) {
        const { count: adminCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', targetInstitutionId)
          .eq('role', 'admin');

        if (adminCount >= limits.maxAdmins) {
          return res.status(403).json({
            error: `Administrative account limit reached for your current plan (${canonicalPlan.toUpperCase()}). Please upgrade to add more administrators.`,
            code: 'ADMIN_LIMIT_REACHED'
          });
        }
      }

      if (role === 'student' && limits.maxStudents !== Infinity) {
        const { count: studentCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('institution_id', targetInstitutionId)
          .eq('role', 'student');

        if (studentCount >= limits.maxStudents) {
          return res.status(403).json({
            error: `Student enrollment limit reached for your current plan (${canonicalPlan.toUpperCase()}). Please upgrade to enroll more students.`,
            code: 'STUDENT_LIMIT_REACHED'
          });
        }
      }
    }

    // 0.2 Uniqueness Check for Name in Institution
    if (targetInstitutionId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('institution_id', targetInstitutionId)
        .ilike('first_name', fName)
        .ilike('last_name', lName || '')
        .maybeSingle();

      if (existingUser) {
        return res.status(400).json({
          error: "A user with the same first and last name already exists in this institution. Please provide a slight variation to distinguish them.",
          code: 'DUPLICATE_NAME'
        });
      }
    }

    // 0.5 Generate custom email if institution has a domain and role permits
    let finalEmail = email;
    if (targetInstitutionId) {
      const { data: inst } = await supabase.from('institutions').select('email_domain').eq('id', targetInstitutionId).single();
      if (inst?.email_domain && ['student', 'teacher', 'admin'].includes(role)) {
        // Automatically generate: first.last@domain.edu
        const cleanF = fName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanL = (lName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (cleanF && cleanL) {
          finalEmail = `${cleanF}.${cleanL}@${inst.email_domain}`;
        } else if (cleanF) {
          finalEmail = `${cleanF}@${inst.email_domain}`;
        }
      }
    }

    // Validate required fields again with potentially updated email
    if (!finalEmail || !fName || !role) {
      return res.status(400).json({
        error: "first_name and role are required. email generation failed or missing.",
      });
    }

    // 1. Generate temporary password for primary user
    const tempPassword = generateTempPassword();

    // 2. Create primary auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: finalEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: finalFullName, first_name: fName, last_name: lName },
      });

    if (authError) throw authError;
    const uid = authData.user.id;

    // 3. Insert into users table
    const { error: userInsertError } = await supabase.from("users").insert({
      id: uid,
      email: finalEmail,
      full_name: finalFullName,
      first_name: fName,
      last_name: lName,
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
          user_metadata: { 
            full_name: `${parent_info.first_name || ''} ${parent_info.last_name || ''}`.trim(),
            first_name: parent_info.first_name,
            last_name: parent_info.last_name 
          },
        });

        if (!pAuthError) {
          const pUid = pAuthData.user.id;

          // Create Parent User
          await supabase.from("users").insert({
            id: pUid,
            email: parent_info.email,
            full_name: `${parent_info.first_name || ''} ${parent_info.last_name || ''}`.trim(),
            first_name: parent_info.first_name || '',
            last_name: parent_info.last_name || '',
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
              full_name: `${parent_info.first_name || ''} ${parent_info.last_name || ''}`.trim()
            };

            // Send Enrollment Email to Parent
            // We do this asynchronously to avoid blocking the main enrollment response
            sendEmail({
              to: parent_info.email,
              subject: "Welcome to Cloudora LMS - Parent Account Details",
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #FF6B00; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Account Created Successfully</h2>
                  </div>
                  <div style="padding: 24px;">
                    <p>Dear ${parent_info.first_name || 'Parent'},</p>
                    <p>Your parent account for the Cloudora LMS platform has been created. You can now log in to monitor your child's academic progress.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #eee;">
                      <p style="margin: 0 0 10px 0;"><strong>Login Credentials:</strong></p>
                      <p style="margin: 5px 0;">Email: <span style="color: #FF6B00; font-weight: bold;">${parent_info.email}</span></p>
                      <p style="margin: 5px 0;">Temporary Password: <span style="color: #FF6B00; font-weight: bold;">${parentTempPass}</span></p>
                    </div>

                    <p style="font-size: 14px; color: #666;">For security reasons, please change your password after your first login.</p>
                    
                    <div style="margin-top: 32px; text-align: center;">
                      <a href="https://cloudoralms.live" style="background-color: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Dashboard</a>
                    </div>
                  </div>
                  <div style="background-color: #f0f0f0; padding: 16px; text-align: center; font-size: 12px; color: #777;">
                    &copy; 2026 Cloudora LMS. All rights reserved.
                  </div>
                </div>
              `,
              text: `Dear ${parent_info.first_name || 'Parent'},\n\nYour parent account for Cloudora LMS has been created.\n\nLogin Credentials:\nEmail: ${parent_info.email}\nTemporary Password: ${parentTempPass}\n\nPlease change your password after your first login.`
            }).catch(e => console.error("Failed to send parent enrollment email:", e));
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
      email: finalEmail,
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
    first_name,
    last_name,
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
    if (first_name !== undefined) userUpdates.first_name = first_name;
    if (last_name !== undefined) userUpdates.last_name = last_name;
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
      .select("id, first_name, last_name, full_name, email, role, avatar_url");

    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,full_name.ilike.%${q}%`);
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
 * Handle logout to clean up trial sessions (demo users only)
 */
exports.logout = async (req, res) => {
  try {
    const user = req.user;

    // Only demo users (email starts with 'demo.') have trial sessions to clean up.
    // Regular admins, students, teachers etc. use 24-hour JWT sessions — do NOT touch them.
    if (user && user.email && user.email.startsWith('demo.')) {
      const { error } = await supabase
        .from('trial_sessions')
        .delete()
        .eq('demo_user_id', user.id);

      if (error) {
        console.warn("Error cleaning up trial session:", error);
      } else {
        console.log(`Trial session cleaned up for demo user ${user.id}`);
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
 * Admin action to reset a user's password manually (Hierarchical control)
 * req.userId, req.userRole etc are provided by authMiddleware
 */
exports.adminResetPassword = async (req, res) => {
  try {
    const { targetUserId, newPassword } = req.body;
    const adminId = req.userId;
    const adminRole = req.userRole;
    const adminInstId = req.institutionId;

    if (!targetUserId || !newPassword) {
      return res.status(400).json({ error: "Target user ID and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Fetch target user info
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('institution_id, role')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    // Role-based hierarchy enforcement
    if (adminRole === 'master_admin') {
      // Master admin can reset any user
    } else if (adminRole === 'admin') {
      // Regular admin can only reset users in their own institution
      if (targetUser.institution_id !== adminInstId) {
        return res.status(403).json({ error: "Access denied. Target user belongs to a different institution." });
      }
      // Admins cannot reset other admins (except themselves via changePassword)
      // They must contact Master Admin for platform-level reset as per user request
      if (targetUser.role === 'admin' && targetUserId !== adminId) {
        return res.status(403).json({ error: "As an institution administrator, you cannot reset other administrators. Please contact the Master Admin." });
      }
    } else {
      return res.status(403).json({ error: "Unauthorized. Insufficient permissions." });
    }

    // Update password via admin API (requires Service Role key)
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    res.status(200).json({ message: "User password has been reset successfully." });
  } catch (err) {
    console.error("adminResetPassword error:", err);
    res.status(500).json({ error: err.message || "Failed to reset user password" });
  }
};

/**
 * Send password reset email (public endpoint) or notify admin for Free tier
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // 0. Rate Limiting Check
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { data: recentRequests, error: _rateError } = await supabase
      .from('password_reset_requests')
      .select('id')
      .eq('email', email)
      .gt('requested_at', new Date(Date.now() - 3600000).toISOString()); // Last 1 hour

    if (recentRequests && recentRequests.length >= 3) {
      return res.status(429).json({ 
        error: "Too many password reset requests. Please try again in an hour.",
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

    // Log the request
    await supabase.from('password_reset_requests').insert({ email, ip_address: ip });

    // Check user role and institution tier for hierarchical recovery requirements
    const { data: userData } = await supabase
      .from("users")
      .select("id, full_name, role, institution_id, institutions!institution_id(subscription_plan)")
      .eq("email", email)
      .single();

    if (userData) {
      const rawPlan = userData.institutions?.subscription_plan;
      const plan = ((p) => {
        const mapping = {
          beta_free: 'beta',
          free: 'beta'
        };
        return mapping[p] || p;
      })(rawPlan);
      const role = userData.role;

      // Hierarchical recovery for Beta Tier (formerly free)
      if (plan === 'beta') {
        if (role === 'student' || role === 'parent' || role === 'teacher' || role === 'bursary') {
          // Notify Institution Admins
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('institution_id', userData.institution_id)
            .eq('role', 'admin');

          if (admins && admins.length > 0) {
            const notifications = admins.map(admin => ({
              user_id: admin.id,
              title: "Password Reset Request",
              message: `${userData.full_name} (${role}) has requested a password reset. Please assist them in the User Management section.`,
              type: 'warning',
              institution_id: userData.institution_id,
              data: { target_user_id: userData.id, target_name: userData.full_name }
            }));
            await supabase.from('notifications').insert(notifications);
          }

          return res.status(200).json({ 
            message: "Your institution is on the Beta Tier. Please contact your internal school administrator to reset your password.",
            is_hierarchical: true
          });
        } else if (role === 'admin') {
          // Notify Master Admins
          const { data: masterAdmins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'master_admin');

          if (masterAdmins && masterAdmins.length > 0) {
            const notifications = masterAdmins.map(ma => ({
              user_id: ma.id,
              title: "Admin Password Reset Request",
              message: `Administrator ${userData.full_name} from a Beta Tier institution has requested a password reset.`,
              type: 'critical',
              data: { target_user_id: userData.id, target_name: userData.full_name, institution_id: userData.institution_id }
            }));
            await supabase.from('notifications').insert(notifications);
          }

          return res.status(200).json({ 
            message: "Administrative reset requested. Please contact the platform support (Master Admin) to reset your password.",
            is_hierarchical: true
          });
        }
      }
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
 * Transfer Main Admin status to another administrator in the same institution.
 * Only current Main Admin can perform this.
 */
exports.transferMainAdmin = async (req, res) => {
  try {
    const { targetAdminUserId } = req.body;
    const currentUserId = req.userId;

    if (!targetAdminUserId) {
      return res.status(400).json({ error: "Recipient admin user ID is required" });
    }

    const { error } = await supabase.rpc('transfer_main_admin_status', {
      p_old_admin_user_id: currentUserId,
      p_new_admin_user_id: targetAdminUserId
    });

    if (error) throw error;

    res.json({ message: "Main Admin status transferred successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
