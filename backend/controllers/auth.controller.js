const process = require("node:process");
const crypto = require("node:crypto");
const supabase = require("../utils/supabaseClient.js");
const { sendEmail } = require("../utils/emailService.js");
const { sendBulkInAppNotificationsWithHistory } = require('../services/notificationDelivery.service.js');
const { canonicalRoleFrom, withRoleAliases } = require("../utils/roleAlias.js");
const { assignStudentToSingleClass } = require('../utils/studentClassEnrollment');

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const ADMIN_DELEGATED_USER_EDIT_PERMISSIONS = new Set([
  'users:write',
  'users:manage',
  'admin:users:edit',
  'admin:users:manage',
]);

const parseUserAgent = (userAgent) => {
  const ua = String(userAgent || '').toLowerCase();

  let osName = 'Unknown OS';
  let deviceType = 'Web';

  if (/iphone|ipod/.test(ua)) {
    osName = 'iOS';
    deviceType = 'iPhone';
  } else if (/ipad/.test(ua)) {
    osName = 'iOS';
    deviceType = 'iPad';
  } else if (/android/.test(ua)) {
    osName = 'Android';
    deviceType = /mobile/.test(ua) ? 'Android Phone' : 'Android Tablet';
  } else if (/windows nt 10\.0/.test(ua)) {
    osName = 'Windows 10/11';
    deviceType = 'Desktop';
  } else if (/windows/.test(ua)) {
    osName = 'Windows';
    deviceType = 'Desktop';
  } else if (/macintosh|mac os x/.test(ua)) {
    osName = 'macOS';
    deviceType = 'Mac';
  } else if (/linux/.test(ua)) {
    osName = 'Linux';
    deviceType = 'Desktop';
  }

  let browser = 'Unknown Browser';
  if (/edg\//.test(ua) || /edge\//.test(ua)) browser = 'Edge';
  else if (/opr\//.test(ua) || /opera/.test(ua)) browser = 'Opera';
  else if (/firefox\//.test(ua) || /fxios/.test(ua)) browser = 'Firefox';
  else if (/crios/.test(ua) || /chrome\//.test(ua)) browser = 'Chrome';
  else if (/safari\//.test(ua)) browser = 'Safari';

  return {
    osName,
    deviceType,
    displayName: `${browser} on ${deviceType}`,
  };
};

// Generate a random 8-character temporary password
const generateTempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const randomBytes = crypto.randomBytes(8);
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const sanitizeNameForEmail = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const buildEmailBaseFromNames = (firstName, lastName) => {
  const cleanFirst = sanitizeNameForEmail(firstName);
  const cleanLast = sanitizeNameForEmail(lastName);
  if (cleanFirst && cleanLast) return `${cleanFirst}.${cleanLast}`;
  return cleanFirst;
};

const generateUniqueInstitutionEmail = async ({
  firstName,
  lastName,
  emailDomain,
  excludeUserId = null,
}) => {
  const baseEmailName = buildEmailBaseFromNames(firstName, lastName);
  if (!baseEmailName) throw new Error('Unable to generate email from provided name.');
  if (!emailDomain) throw new Error('Institution email domain is missing.');

  let candidate = `${baseEmailName}@${String(emailDomain).trim().toLowerCase()}`;
  let suffix = 1;

  for (; ;) {
    const { data: existingRows, error } = await supabase
      .from('users')
      .select('id')
      .ilike('email', candidate)
      .limit(1);
    if (error) throw error;

    const existing = Array.isArray(existingRows) ? existingRows[0] : null;

    if (!existing || (excludeUserId && existing.id === excludeUserId)) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseEmailName}${suffix}@${String(emailDomain).trim().toLowerCase()}`;
  }
};

const getRequestContext = (req) => ({
  ip_address: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
  user_agent: req?.headers?.['user-agent'] || null,
});

const writePasswordAuditLog = async ({
  action,
  actorUserId = null,
  targetUserId = null,
  targetEmail = null,
  outcome = 'success',
  reason = null,
  ipAddress = null,
  userAgent = null,
  metadata = {},
}) => {
  try {
    await supabase.from('password_audit_logs').insert({
      action,
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      target_email: targetEmail,
      outcome,
      reason,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    });
  } catch (auditError) {
    console.error('Password audit log write failed:', auditError?.message || auditError);
  }
};

const normalizeSecurityAnswer = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

const hashSecurityAnswer = (answer, salt) => {
  return crypto
    .createHash('sha256')
    .update(`${salt}:${normalizeSecurityAnswer(answer)}`)
    .digest('hex');
};

const isMissingCanManageUsersColumnError = (error) => {
  const message = String(error?.message || '');
  return /can_manage_users does not exist/i.test(message);
};

const fetchAdminRowWithDelegationFallback = async (userId) => {
  let { data, error } = await supabase
    .from('admins')
    .select('id, is_main, can_manage_users')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && isMissingCanManageUsersColumnError(error)) {
    const fallback = await supabase
      .from('admins')
      .select('id, is_main')
      .eq('user_id', userId)
      .maybeSingle();

    return {
      data: fallback.data
        ? { ...fallback.data, can_manage_users: !!fallback.data?.is_main }
        : null,
      error: fallback.error,
      delegationColumnMissing: true,
    };
  }

  return {
    data,
    error,
    delegationColumnMissing: false,
  };
};

const updateAdminManageUsersWithFallback = async (userId, canManageUsers) => {
  const updateResult = await supabase
    .from('admins')
    .update({ can_manage_users: !!canManageUsers })
    .eq('user_id', userId);

  if (updateResult.error && isMissingCanManageUsersColumnError(updateResult.error)) {
    return { error: null, skipped: true };
  }

  return { error: updateResult.error, skipped: false };
};

const hasDelegatedUserEditPermission = (req) => {
  if (req?.user?.can_manage_users) return true;
  const permissions = Array.isArray(req?.user?.permissions) ? req.user.permissions : [];
  return permissions.some((permission) =>
    ADMIN_DELEGATED_USER_EDIT_PERMISSIONS.has(String(permission || '').trim().toLowerCase())
  );
};

const canAdminManageUsers = ({ isMain = false, hasDelegatedPermission = false }) => {
  return !!isMain || !!hasDelegatedPermission;
};

const SECURITY_QUESTIONS = {
  q_childhood_nickname: 'What is your childhood nickname?',
  q_first_school: 'What is the name of your first school?',
  q_birth_city: 'What city were you born in?',
};

const SECURITY_QUESTION_KEY_PREFIX = '__question_key__:';

const isValidSecurityQuestionKey = (key) => Object.prototype.hasOwnProperty.call(SECURITY_QUESTIONS, key);

const encodeSecurityQuestionKey = (key) => `${SECURITY_QUESTION_KEY_PREFIX}${key}`;

const decodeSecurityQuestionKey = (value) => {
  const raw = String(value || '');
  if (!raw.startsWith(SECURITY_QUESTION_KEY_PREFIX)) return null;
  const key = raw.slice(SECURITY_QUESTION_KEY_PREFIX.length);
  return isValidSecurityQuestionKey(key) ? key : null;
};

const getStoredSecurityQuestionKey = (answersRow) => {
  return decodeSecurityQuestionKey(answersRow?.question2_salt) || 'q_childhood_nickname';
};

const getSecurityQuestionAttemptCount = async ({ email, userId }) => {
  const normalizedEmail = normalizeEmail(email);
  let query = supabase
    .from('password_audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'forgot_password_request')
    .eq('outcome', 'failure')
    .eq('reason', 'security_question_attempt_failed')
    .gt('created_at', new Date(Date.now() - 3600000).toISOString());

  if (userId) query = query.eq('target_user_id', userId);
  else query = query.eq('target_email', normalizedEmail);

  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
};

const revokeAllUserSessions = async (userId) => {
  if (!userId) return;
  await supabase
    .from('user_sessions')
    .update({ is_revoked: true })
    .eq('user_id', userId)
    .eq('is_revoked', false);
};

const buildCredentialDeliveryUrl = (token) => {
  const base =
    process.env.CREDENTIAL_DELIVERY_BASE_URL ||
    process.env.EXPO_PUBLIC_APP_URL ||
    'http://localhost:8081';
  return `${base.replace(/\/+$/, '')}/credential-delivery?token=${encodeURIComponent(token)}`;
};

const createCredentialDeliveryToken = async ({
  createdBy,
  targetUserId,
  targetEmail,
  temporaryPassword,
  metadata = {},
}) => {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('credential_delivery_tokens').insert({
    token,
    created_by: createdBy || null,
    target_user_id: targetUserId || null,
    target_email: targetEmail,
    temporary_password: temporaryPassword,
    metadata,
    expires_at: expiresAt,
  });

  if (error) throw error;

  return {
    token,
    expiresAt,
    url: buildCredentialDeliveryUrl(token),
  };
};

const buildCredentialDocument = ({
  fullName,
  role,
  email,
  temporaryPassword,
  credentialUrl,
  expiresAt,
}) => {
  const lines = [
    'Cloudora LMS Credential Delivery',
    `Name: ${fullName || 'N/A'}`,
    `Role: ${role || 'N/A'}`,
    `Email: ${email}`,
    `Temporary password: ${temporaryPassword}`,
  ];

  if (credentialUrl) {
    lines.push(`One-time credential link: ${credentialUrl}`);
  }

  if (expiresAt) {
    lines.push(`Link expires at (UTC): ${expiresAt}`);
  }

  lines.push('Security notice: Change password immediately on first login.');
  return lines.join('\n');
};

const PLAN_NORMALIZATION_MAP = {
  free: 'beta',
  beta_free: 'beta',
  basic_basic: 'basic',
  basic_pro: 'pro',
  basic_premium: 'premium',
  trial: 'basic',
  enterprise_basic: 'premium',
  enterprise_pro: 'premium',
  enterprise_premium: 'premium',
  custom_basic: 'premium',
  custom_pro: 'premium',
  custom_premium: 'premium',
};

const canonicalPlanFrom = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  const mapped = PLAN_NORMALIZATION_MAP[raw] || raw || 'basic';
  return ['beta', 'basic', 'pro', 'premium'].includes(mapped) ? mapped : 'basic';
};

const PLAN_LIMITS = {
  beta: { maxStudents: 30, maxAdmins: 2 },
  basic: { maxStudents: 900, maxAdmins: Infinity },
  pro: { maxStudents: 1000, maxAdmins: Infinity },
  premium: { maxStudents: 5000, maxAdmins: Infinity },
};

const getInstitutionSlotCapacity = async (institutionId) => {
  if (!institutionId) {
    throw new Error('Institution ID is required to resolve slot capacity.');
  }

  const { data: institution, error: institutionError } = await supabase
    .from('institutions')
    .select('id, subscription_plan, custom_student_limit')
    .eq('id', institutionId)
    .single();

  if (institutionError || !institution) {
    const message = institutionError?.message || 'Institution not found.';
    throw new Error(message);
  }

  const canonicalPlan = canonicalPlanFrom(institution.subscription_plan || 'basic');
  const baseLimits = PLAN_LIMITS[canonicalPlan] || PLAN_LIMITS.basic;
  let maxStudents = baseLimits.maxStudents;
  const maxAdmins = baseLimits.maxAdmins;

  if (canonicalPlan === 'beta') {
    const parsed = Number(institution.custom_student_limit);
    if (Number.isFinite(parsed) && parsed > 0) {
      maxStudents = parsed;
    }
  }

  const [{ count: studentCount = 0, error: studentCountError }, { count: adminCount = 0, error: adminCountError }] = await Promise.all([
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'student'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role', 'admin'),
  ]);

  if (studentCountError) throw studentCountError;
  if (adminCountError) throw adminCountError;

  const remainingStudents = maxStudents === Infinity ? Infinity : Math.max(0, maxStudents - Number(studentCount || 0));
  const remainingAdmins = maxAdmins === Infinity ? Infinity : Math.max(0, maxAdmins - Number(adminCount || 0));
  const serializeLimit = (value) => (value === Infinity ? null : value);

  return {
    institution_id: institutionId,
    plan: canonicalPlan,
    limits: {
      student: serializeLimit(maxStudents),
      admin: serializeLimit(maxAdmins),
    },
    usage: {
      student: Number(studentCount || 0),
      admin: Number(adminCount || 0),
    },
    remaining: {
      student: serializeLimit(remainingStudents),
      admin: serializeLimit(remainingAdmins),
    },
    at_capacity: {
      student: maxStudents !== Infinity && Number(studentCount || 0) >= maxStudents,
      admin: maxAdmins !== Infinity && Number(adminCount || 0) >= maxAdmins,
    },
  };
};

exports.login = async (req, res) => {
  const body = req.body;
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { data: maintenanceRow, error: maintenanceError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();

    if (maintenanceError) throw maintenanceError;

    const maintenanceValue = maintenanceRow?.value || {};
    if (maintenanceValue.enabled === true) {
      return res.status(503).json({
        error: String(maintenanceValue.message || 'System maintenance is in progress. Please try again later.'),
        code: 'MAINTENANCE_MODE',
      });
    }

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
      .select("first_name, last_name, full_name, role, institution_id, must_change_password, requires_security_questions_setup, admins!user_id(is_main)")
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
        .select('subscription_status, subscription_plan, subscription_tracking_start_date, has_used_trial')
        .eq('id', userData.institution_id)
        .single();

      if (instData) {
        if (instData.subscription_status === 'suspended') {
          return res.status(403).json({
            error: 'Your institution account is currently disabled. Please contact the platform administrator.',
            code: 'INSTITUTION_SUSPENDED',
          });
        }

        subscription = {
          status: instData.subscription_status,
          plan: instData.subscription_plan,
          subscriptionTrackingStartDate: instData.subscription_tracking_start_date,
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
      user: withRoleAliases({
        uid: user.id,
        email: user.email,
        full_name: userData.full_name,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        must_change_password: !!userData.must_change_password,
        requires_security_questions_setup: !!userData.requires_security_questions_setup,
        institution_id: userData.institution_id,
        isPlatformAdmin,
        isMain,
        customId,
        subscription
      }),
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
    linked_parents,  // array of parent IDs to link to student
    parent_relationship, // relationship used when linking parent-student
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
    const requesterRole = canonicalRoleFrom(req.userRole);
    const requesterIsPlatformAdmin = requesterRole === 'platform_admin';
    const requesterCanManageUsers = requesterIsPlatformAdmin
      ? true
      : canAdminManageUsers({
        isMain: !!req.isMain,
        hasDelegatedPermission: hasDelegatedUserEditPermission(req),
      });

    if (!requesterCanManageUsers) {
      return res.status(403).json({
        error: 'Only main administrators or delegated administrators can enroll users.',
        code: 'ADMIN_USER_MANAGEMENT_DENIED',
      });
    }

    // Automatically assign institution based on admin session (Strict Scoping)
    // Only Platform Admins can override the target institution.
    const targetInstitutionId = req.isPlatformAdmin ? (institution_id || req.institution_id) : req.institution_id;

    // 0. Enforce Limits
    if (targetInstitutionId) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('subscription_plan, email_domain, custom_student_limit')
        .eq('id', targetInstitutionId)
        .single();

      const _institutionDomain = inst?.email_domain;

      const canonicalPlan = canonicalPlanFrom(inst?.subscription_plan || 'basic');
      let limits = PLAN_LIMITS[canonicalPlan] ?? { maxStudents: 900, maxAdmins: Infinity };

      // Beta supports institution-level custom student limit override.
      if (canonicalPlan === 'beta' && inst?.custom_student_limit !== null && inst?.custom_student_limit !== undefined) {
        const parsedLimit = Number(inst.custom_student_limit);
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          limits = { ...limits, maxStudents: parsedLimit };
        }
      }

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


    // 0.5 Generate custom email if not provided
    let finalEmail = normalizeEmail(email);
    if (!finalEmail && targetInstitutionId) {
      const { data: inst } = await supabase
        .from('institutions')
        .select('email_domain')
        .eq('id', targetInstitutionId)
        .single();

      if (inst?.email_domain && ['student', 'teacher', 'admin'].includes(role)) {
        const cleanF = fName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanL = (lName || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        let baseEmail = '';
        if (cleanF && cleanL) {
          baseEmail = `${cleanF}.${cleanL}`;
        } else if (cleanF) {
          baseEmail = cleanF;
        }

        if (baseEmail) {
          finalEmail = `${baseEmail}@${inst.email_domain}`;

          // Collision Check
          let isAvailable = false;
          let counter = 1;
          while (!isAvailable) {
            const { data: existing } = await supabase
              .from('users')
              .select('id')
              .ilike('email', finalEmail)
              .maybeSingle();

            if (existing) {
              counter++;
              finalEmail = `${baseEmail}${counter}@${inst.email_domain}`;
            } else {
              isAvailable = true;
            }
          }
        }
      } else if (!inst?.email_domain) {
        return res.status(400).json({
          error: "An email is required. Auto-generation failed because this institution does not have a configured email domain.",
          code: 'MISSING_EMAIL_DOMAIN'
        });
      } else {
        return res.status(400).json({
          error: `Email generation is not supported for role: ${role}. Please provide an email manually.`,
          code: 'EMAIL_REQUIRED_FOR_ROLE'
        });
      }
    } else if (!finalEmail && !targetInstitutionId) {
      return res.status(400).json({
        error: "Email is required.",
        code: 'MISSING_EMAIL'
      });
    }

    // Validate required fields again with potentially updated email
    finalEmail = normalizeEmail(finalEmail);

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
      must_change_password: true,
      requires_security_questions_setup: true,
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

      // Class enrollment (single active class per student)
      if (class_ids && class_ids.length > 0 && customId) {
        await assignStudentToSingleClass({
          studentId: customId,
          classId: class_ids[0],
          institutionId: targetInstitutionId,
          syncStudentLevel: true,
        });
      }

      // Link existing parent(s) selected during student enrollment flow.
      // UI currently sends one ID, but backend supports multiple for compatibility.
      if (linked_parents && linked_parents.length > 0 && customId) {
        const uniqueParentIds = Array.from(
          new Set(
            linked_parents
              .map((value) => String(value || '').trim())
              .filter(Boolean)
          )
        );

        if (uniqueParentIds.length > 0) {
          if (!targetInstitutionId) {
            return res.status(400).json({
              error: 'Cannot link parent accounts without a target institution.',
              code: 'INVALID_PARENT_LINKS',
            });
          }

          const { data: allowedParentRows, error: allowedParentsError } = await supabase
            .from('parents')
            .select('id, users!inner(institution_id)')
            .in('id', uniqueParentIds)
            .eq('users.institution_id', targetInstitutionId);

          if (allowedParentsError) throw allowedParentsError;

          const allowedParentIds = new Set(
            (allowedParentRows || []).map((row) => String(row.id || '').trim()).filter(Boolean)
          );

          const invalidParentIds = uniqueParentIds.filter((parentId) => !allowedParentIds.has(parentId));
          if (invalidParentIds.length > 0) {
            return res.status(400).json({
              error: 'One or more selected parents are invalid for this institution.',
              code: 'INVALID_PARENT_LINKS',
            });
          }

          const relationship = String(parent_relationship || 'guardian').trim() || 'guardian';
          const { data: existingParentLinks, error: existingParentLinksError } = await supabase
            .from('parent_students')
            .select('parent_id')
            .eq('student_id', customId)
            .in('parent_id', uniqueParentIds);

          if (existingParentLinksError) throw existingParentLinksError;

          const linkedParentIds = new Set((existingParentLinks || []).map((row) => row.parent_id));
          const linkRows = uniqueParentIds
            .filter((parentId) => !linkedParentIds.has(parentId))
            .map((parentId) => ({
              parent_id: parentId,
              student_id: customId,
              relationship,
            }));

          if (linkRows.length > 0) {
            const { error: linkedParentError } = await supabase
              .from('parent_students')
              .insert(linkRows);

            if (linkedParentError) throw linkedParentError;
          }
        }
      }

      // Optional Atomic Parent Creation
      if (parent_info && parent_info.email && (parent_info.full_name || parent_info.first_name)) {
        try {
          const parentEmail = normalizeEmail(parent_info.email);
          if (!parentEmail) {
            throw new Error('Parent email is required to create a linked parent account.');
          }

          let parentFirstName = String(parent_info.first_name || '').trim();
          let parentLastName = String(parent_info.last_name || '').trim();

          if (!parentFirstName && parent_info.full_name) {
            const parentNameParts = String(parent_info.full_name).trim().split(/\s+/);
            parentFirstName = parentNameParts[0] || '';
            parentLastName = parentNameParts.slice(1).join(' ');
          }

          if (!parentFirstName) {
            throw new Error('Parent first name is required to create a linked parent account.');
          }

          const parentFullName = `${parentFirstName} ${parentLastName}`.trim();
          const parentTempPass = generateTempPassword();

          // Create Parent Auth
          const { data: pAuthData, error: pAuthError } = await supabase.auth.admin.createUser({
            email: parentEmail,
            password: parentTempPass,
            email_confirm: true,
            user_metadata: {
              full_name: parentFullName,
              first_name: parentFirstName,
              last_name: parentLastName,
            },
          });

          if (pAuthError) throw pAuthError;

          const pUid = pAuthData.user.id;

          // Create Parent User
          const { error: pUserError } = await supabase.from("users").insert({
            id: pUid,
            email: parentEmail,
            full_name: parentFullName,
            first_name: parentFirstName,
            last_name: parentLastName,
            role: 'parent',
            must_change_password: true,
            requires_security_questions_setup: true,
            phone: parent_info.phone || null,
            institution_id: targetInstitutionId,
          });

          if (pUserError) throw pUserError;

          // Aggressive retry for trigger creation (up to 2 seconds)
          let pData = null;
          for (let i = 0; i < 4; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data } = await supabase.from('parents').select('id').eq('user_id', pUid).maybeSingle();
            if (data) {
              pData = data;
              break;
            }
          }

          if (!pData) {
            throw new Error("The 'parents' record was not created fast enough by the database trigger.");
          }

          // Update Parent role entry
          await supabase.from('parents').update({
            occupation: parent_info.occupation || null,
            address: parent_info.address || null,
          }).eq('id', pData.id);

          if (customId) {
            // Link parent to student
            const { error: linkErr } = await supabase.from('parent_students').insert({
              parent_id: pData.id,
              student_id: customId,
              relationship: parent_info.relationship || parent_relationship || 'guardian'
            });

            if (linkErr) throw linkErr;

            const parentCredentialDelivery = await createCredentialDeliveryToken({
              createdBy: req.userId || null,
              targetUserId: pUid,
              targetEmail: parentEmail,
              temporaryPassword: parentTempPass,
              metadata: {
                role: 'parent',
                enrolled_from_student_id: customId,
              },
            });

            parentResult = {
              email: parentEmail,
              tempPassword: parentTempPass,
              credential_delivery: parentCredentialDelivery,
              credential_document: buildCredentialDocument({
                fullName: parentFullName,
                role: 'parent',
                email: parentEmail,
                temporaryPassword: parentTempPass,
                credentialUrl: parentCredentialDelivery.url,
                expiresAt: parentCredentialDelivery.expiresAt,
              }),
              customId: pData.id,
              full_name: parentFullName,
            };

            // Send Enrollment Email to Parent (async)
            sendEmail({
              to: parentEmail,
              subject: "Welcome to Cloudora LMS - Parent Account Details",
              html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                  <div style="background-color: #FF6B00; padding: 20px; text-align: center;">
                    <h2 style="color: white; margin: 0;">Account Created Successfully</h2>
                  </div>
                  <div style="padding: 24px;">
                    <p>Dear ${parentFirstName || 'Parent'},</p>
                    <p>Your parent account for the Cloudora LMS platform has been created. You can now log in to monitor your child's academic progress.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #eee;">
                      <p style="margin: 0 0 10px 0;"><strong>Login Credentials:</strong></p>
                      <p style="margin: 5px 0;">Email: <span style="color: #FF6B00; font-weight: bold;">${parentEmail}</span></p>
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
              text: `Dear ${parentFirstName || 'Parent'},\n\nYour parent account for Cloudora LMS has been created.\n\nLogin Credentials:\nEmail: ${parentEmail}\nTemporary Password: ${parentTempPass}\n\nPlease change your password after your first login.`
            }).catch(e => console.error("Failed to send parent enrollment email:", e));
          } else {
            throw new Error("Missing Student ID to link with Parent");
          }
        } catch (parentError) {
          console.error("============= [ATOMIC PARENT CREATION ERROR] =============", parentError);
          parentResult = { error: parentError.message || 'Unknown error occurred while creating parent account' };
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
      const { data: adminData, error: adminDataError } = await supabase
        .from('admins').select('id, is_main').eq('user_id', uid).single();
      if (adminDataError) throw adminDataError;

      const { error: adminPermissionError } = await updateAdminManageUsersWithFallback(uid, !!adminData?.is_main);
      if (adminPermissionError) throw adminPermissionError;

      customId = adminData?.id;
    }

    if (role === 'bursary') {
      const { data: bursarData } = await supabase
        .from('bursars').select('id').eq('user_id', uid).single();
      customId = bursarData?.id;
    }

    const credentialDelivery = await createCredentialDeliveryToken({
      createdBy: req.userId || null,
      targetUserId: uid,
      targetEmail: finalEmail,
      temporaryPassword: tempPassword,
      metadata: {
        role,
        institution_id: targetInstitutionId || null,
      },
    });

    res.status(201).json({
      message: "User enrolled successfully",
      uid,
      email: finalEmail,
      tempPassword,
      credential_delivery: credentialDelivery,
      credential_document: buildCredentialDocument({
        fullName: finalFullName,
        role,
        email: finalEmail,
        temporaryPassword: tempPassword,
        credentialUrl: credentialDelivery.url,
        expiresAt: credentialDelivery.expiresAt,
      }),
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
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, role, institution_id, first_name, last_name')
      .eq('id', id)
      .single();

    if (targetUserError || !targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const requesterRole = canonicalRoleFrom(req.userRole);
    const targetRole = canonicalRoleFrom(targetUser.role);
    const requesterIsPlatformAdmin = requesterRole === 'platform_admin';
    const requesterHasDelegatedEdit = hasDelegatedUserEditPermission(req);
    const requesterCanManageUsers = requesterIsPlatformAdmin
      ? true
      : canAdminManageUsers({
        isMain: !!req.isMain,
        hasDelegatedPermission: requesterHasDelegatedEdit,
      });

    if (!requesterCanManageUsers) {
      return res.status(403).json({
        error: 'Only main administrators or delegated administrators can edit users.',
        code: 'ADMIN_USER_MANAGEMENT_DENIED',
      });
    }

    if (!requesterIsPlatformAdmin && targetUser.institution_id !== req.institution_id) {
      return res.status(403).json({
        error: 'Cannot edit users outside your institution.',
        code: 'CROSS_INSTITUTION_DENIED',
      });
    }

    if (!requesterIsPlatformAdmin && (first_name !== undefined || last_name !== undefined || full_name !== undefined || email !== undefined)) {
      return res.status(403).json({
        error: 'Only Master Admin can edit first name, last name, full name, or email.',
      });
    }

    // 1. Build users table update
    const userUpdates = {};
    if (first_name !== undefined) userUpdates.first_name = String(first_name || '').trim();
    if (last_name !== undefined) userUpdates.last_name = String(last_name || '').trim();
    if (full_name !== undefined) userUpdates.full_name = String(full_name || '').trim();
    if (email !== undefined) userUpdates.email = String(email || '').trim().toLowerCase();
    if (phone !== undefined) userUpdates.phone = phone || null;
    if (gender !== undefined) userUpdates.gender = gender || null;
    if (date_of_birth !== undefined) userUpdates.date_of_birth = date_of_birth || null;
    if (address !== undefined) userUpdates.address = address || null;
    if (institution_id !== undefined) userUpdates.institution_id = institution_id || req.institution_id;
    if (avatar_url !== undefined) userUpdates.avatar_url = avatar_url || null;

    // Derived full_name if first_name and last_name are provided but full_name is not
    if (full_name === undefined && (first_name !== undefined || last_name !== undefined)) {
      // Best effort to construct it from the request body
      const fName = first_name !== undefined ? (first_name || '') : '';
      const lName = last_name !== undefined ? (last_name || '') : '';
      if (fName || lName) {
        userUpdates.full_name = `${fName} ${lName}`.trim();
      }
    }

    // For master admin identity edits, regenerate institution-domain email from names.
    if (requesterIsPlatformAdmin && (first_name !== undefined || last_name !== undefined) && targetUser.institution_id) {
      const nextFirst = first_name !== undefined ? String(first_name || '').trim() : String(targetUser.first_name || '').trim();
      const nextLast = last_name !== undefined ? String(last_name || '').trim() : String(targetUser.last_name || '').trim();

      if (nextFirst) {
        const { data: institution, error: institutionError } = await supabase
          .from('institutions')
          .select('email_domain')
          .eq('id', targetUser.institution_id)
          .single();
        if (institutionError) throw institutionError;

        const nextEmail = await generateUniqueInstitutionEmail({
          firstName: nextFirst,
          lastName: nextLast,
          emailDomain: institution?.email_domain,
          excludeUserId: id,
        });

        userUpdates.email = nextEmail;
        userUpdates.full_name = `${nextFirst} ${nextLast}`.trim();
      }
    }

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

      // Update class enrollment (single active class per student)
      if (class_id !== undefined) {
        // Resolve custom student ID
        const { data: studentData } = await supabase.from('students').select('id').eq('user_id', id).single();
        const customStudentId = studentData?.id;

        if (customStudentId) {
          await assignStudentToSingleClass({
            studentId: customStudentId,
            classId: class_id,
            institutionId: req.institution_id,
            syncStudentLevel: true,
          });
        }
      }

      // Link Parents (New Feature)
      if (linked_parents !== undefined) {
        const { data: studentData } = await supabase.from('students').select('id').eq('user_id', id).single();
        const customStudentId = studentData?.id;

        if (customStudentId) {
          const uniqueParentIds = Array.from(
            new Set(
              (Array.isArray(linked_parents) ? linked_parents : [])
                .map((value) => String(value || '').trim())
                .filter(Boolean)
            )
          );

          if (uniqueParentIds.length > 0) {
            const institutionScopeId = requesterIsPlatformAdmin
              ? (targetUser.institution_id || institution_id || null)
              : req.institution_id;

            if (!institutionScopeId) {
              return res.status(400).json({
                error: 'Cannot link parents without a valid institution scope.',
                code: 'INVALID_PARENT_LINKS',
              });
            }

            const { data: allowedParentRows, error: allowedParentsError } = await supabase
              .from('parents')
              .select('id, users!inner(institution_id)')
              .in('id', uniqueParentIds)
              .eq('users.institution_id', institutionScopeId);

            if (allowedParentsError) throw allowedParentsError;

            const allowedParentIds = new Set(
              (allowedParentRows || []).map((row) => String(row.id || '').trim()).filter(Boolean)
            );

            const invalidParentIds = uniqueParentIds.filter((parentId) => !allowedParentIds.has(parentId));
            if (invalidParentIds.length > 0) {
              return res.status(400).json({
                error: 'One or more selected parents are invalid for this institution.',
                code: 'INVALID_PARENT_LINKS',
              });
            }
          }

          const { error: delErr } = await supabase.from('parent_students').delete().eq('student_id', customStudentId);
          if (delErr) console.error('[AdminUpdate] Delete parent_students (student side) error:', delErr);

          if (uniqueParentIds.length > 0) {
            const inserts = uniqueParentIds.map(pid => ({ parent_id: pid, student_id: customStudentId, relationship: 'guardian' }));
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

        if (customParentId) {
          // Simple sync: delete all and re-insert
          const { error: delErr } = await supabase.from('parent_students').delete().eq('parent_id', customParentId);
          if (delErr) console.error('[AdminUpdate] Delete parent_students error:', delErr);

          if (linked_students && linked_students.length > 0) {
            const inserts = linked_students.map(sid => ({ parent_id: customParentId, student_id: sid, relationship: 'guardian' }));
            const { error: insErr } = await supabase.from('parent_students').insert(inserts);
            if (insErr) console.error('[AdminUpdate] Insert parent_students error:', insErr);
          }
        } else {
          console.warn('[AdminUpdate] No parent record found for user_id:', id);
        }
      }
    }

    if (requesterIsPlatformAdmin && (userUpdates.email !== undefined || userUpdates.first_name !== undefined || userUpdates.last_name !== undefined || userUpdates.full_name !== undefined)) {
      const { data: updatedUserForAuth } = await supabase
        .from('users')
        .select('email, first_name, last_name, full_name')
        .eq('id', id)
        .single();

      await supabase.auth.admin.updateUserById(id, {
        ...(updatedUserForAuth?.email ? { email: updatedUserForAuth.email } : {}),
        user_metadata: {
          full_name: updatedUserForAuth?.full_name || '',
          first_name: updatedUserForAuth?.first_name || '',
          last_name: updatedUserForAuth?.last_name || '',
        },
      });
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
    const callerRole = req.userRole;
    const callerInstitutionId = req.institution_id;

    let query = supabase
      .from("users")
      .select("id, first_name, last_name, full_name, email, role, avatar_url");

    // Non-master-admins can only search within their own institution
    if (callerRole !== 'master_admin') {
      if (!callerInstitutionId) {
        return res.status(403).json({ error: "No institution associated with this account" });
      }
      query = query.eq("institution_id", callerInstitutionId);
    }

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
      }
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout error" });
  }
};

/**
 * Change password for authenticated user.
 *
 * Normal flow requires current_password + new_password.
 * First-login setup flow (must_change_password=true) allows setting
 * new_password without current_password because the user is already
 * constrained by the credential-setup gate.
 */
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.userId;
    const { ip_address: ipAddress, user_agent: userAgent } = getRequestContext(req);

    if (!new_password) {
      return res.status(400).json({ error: "New password is required" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    // Verify current password by attempting sign-in
    const { data: userData } = await supabase
      .from('users')
      .select('email, must_change_password, requires_security_questions_setup')
      .eq('id', userId)
      .single();
    if (!userData) return res.status(404).json({ error: "User not found" });

    const isFirstLoginCredentialSetup = !!userData.must_change_password && !!userData.requires_security_questions_setup;

    if (isFirstLoginCredentialSetup) {
      return res.status(409).json({
        error: 'Complete security question setup together with password update',
        code: 'USE_COMPLETE_CREDENTIAL_SETUP',
      });
    }

    if (!current_password) {
      return res.status(400).json({ error: "Current password is required" });
    }

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
      await writePasswordAuditLog({
        action: 'change_password',
        actorUserId: userId,
        targetUserId: userId,
        targetEmail: userData.email,
        outcome: 'failure',
        reason: 'current_password_incorrect',
        ipAddress,
        userAgent,
      });
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password,
    });

    if (updateError) throw updateError;

    await supabase
      .from('users')
      .update({ must_change_password: false })
      .eq('id', userId);

    await writePasswordAuditLog({
      action: 'change_password',
      actorUserId: userId,
      targetUserId: userId,
      targetEmail: userData.email,
      outcome: 'success',
      ipAddress,
      userAgent,
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("changePassword error:", err);
    await writePasswordAuditLog({
      action: 'change_password',
      actorUserId: req.userId || null,
      targetUserId: req.userId || null,
      outcome: 'failure',
      reason: err?.message || 'change_password_failed',
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
    res.status(500).json({ error: err.message || "Failed to change password" });
  }
};

exports.adminResetPassword = async (req, res) => {
  try {
    const { targetUserId, newPassword } = req.body;
    const adminId = req.userId;
    const adminRole = req.userRole;
    const adminInstId = req.institution_id;
    const adminIsMain = !!req.isMain;
    const adminHasDelegatedEdit = hasDelegatedUserEditPermission(req);
    const adminCanManageUsers = adminRole === 'master_admin'
      ? true
      : canAdminManageUsers({ isMain: adminIsMain, hasDelegatedPermission: adminHasDelegatedEdit });
    const { ip_address: ipAddress, user_agent: userAgent } = getRequestContext(req);

    if (!targetUserId) {
      return res.status(400).json({ error: "Target user ID is required" });
    }
    const otpReset = !!req.body.otpReset;
    const generatedPassword = !newPassword && !otpReset;
    const finalPassword = otpReset
      ? crypto.randomUUID() + '-' + crypto.randomUUID()
      : (generatedPassword ? generateTempPassword() : String(newPassword || ''));

    if (!otpReset && finalPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Fetch target user info
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('institution_id, role, email, full_name')
      .eq('id', targetUserId)
      .single();

    if (targetError || !targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    if (!adminCanManageUsers) {
      await writePasswordAuditLog({
        action: 'admin_reset_password',
        actorUserId: adminId,
        targetUserId,
        outcome: 'failure',
        reason: 'admin_user_management_denied',
        ipAddress,
        userAgent,
        metadata: { admin_role: adminRole, admin_is_main: adminIsMain },
      });
      return res.status(403).json({
        error: 'Only main administrators or delegated administrators can reset passwords.',
        code: 'ADMIN_USER_MANAGEMENT_DENIED',
      });
    }

    // Role-based hierarchy enforcement
    if (adminRole === 'master_admin') {
      // Master admin can reset any user
    } else if (adminRole === 'admin') {
      // Regular admin can only reset users in their own institution
      if (targetUser.institution_id !== adminInstId) {
        await writePasswordAuditLog({
          action: 'admin_reset_password',
          actorUserId: adminId,
          targetUserId,
          outcome: 'failure',
          reason: 'cross_institution_denied',
          ipAddress,
          userAgent,
          metadata: { admin_role: adminRole },
        });
        return res.status(403).json({ error: "Access denied. Target user belongs to a different institution." });
      }
      // Non-main admins cannot reset other admins unless delegated permission exists
      if (!adminIsMain && targetUser.role === 'admin' && targetUserId !== adminId) {
        await writePasswordAuditLog({
          action: 'admin_reset_password',
          actorUserId: adminId,
          targetUserId,
          outcome: 'failure',
          reason: 'non_main_admin_to_admin_denied',
          ipAddress,
          userAgent,
          metadata: { admin_role: adminRole, admin_is_main: adminIsMain },
        });
        return res.status(403).json({
          error: 'Non-main administrators cannot reset other administrators unless ownership is delegated.',
          code: 'NON_MAIN_ADMIN_RESET_DENIED',
        });
      }

      if (adminIsMain && targetUser.role === 'admin' && targetUserId !== adminId) {
        const { data: targetAdminRow, error: targetAdminErr } = await supabase
          .from('admins')
          .select('is_main, institution_id')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (targetAdminErr) throw targetAdminErr;

        if (!targetAdminRow || targetAdminRow.institution_id !== adminInstId) {
          await writePasswordAuditLog({
            action: 'admin_reset_password',
            actorUserId: adminId,
            targetUserId,
            outcome: 'failure',
            reason: 'target_admin_not_in_institution',
            ipAddress,
            userAgent,
            metadata: { admin_role: adminRole, admin_is_main: adminIsMain },
          });
          return res.status(403).json({
            error: 'Target administrator not found in your institution.',
            code: 'TARGET_ADMIN_NOT_FOUND',
          });
        }

        if (!!targetAdminRow.is_main) {
          await writePasswordAuditLog({
            action: 'admin_reset_password',
            actorUserId: adminId,
            targetUserId,
            outcome: 'failure',
            reason: 'main_admin_to_main_admin_denied',
            ipAddress,
            userAgent,
            metadata: { admin_role: adminRole, admin_is_main: adminIsMain },
          });
          return res.status(403).json({
            error: 'Main admin cannot reset another main admin password.',
            code: 'MAIN_ADMIN_RESET_MAIN_ADMIN_DENIED',
          });
        }
      }
    } else {
      await writePasswordAuditLog({
        action: 'admin_reset_password',
        actorUserId: adminId,
        targetUserId,
        outcome: 'failure',
        reason: 'insufficient_permissions',
        ipAddress,
        userAgent,
        metadata: { admin_role: adminRole },
      });
      return res.status(403).json({ error: "Unauthorized. Insufficient permissions." });
    }

    // Update password via admin API (requires Service Role key)
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      password: finalPassword,
    });

    if (updateError) throw updateError;

    await supabase
      .from('users')
      .update({
        must_change_password: true,
        requires_security_questions_setup: true,
      })
      .eq('id', targetUserId);

    await revokeAllUserSessions(targetUserId);

    if (otpReset) {
      // Trigger existing OTP verification flow if user has email
      if (targetUser.email) {
        try {
          const { createClient } = require("@supabase/supabase-js");
          const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://example.supabase.co';
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'anon-key-placeholder';
          const scopedClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { auth: { persistSession: false } }
          );
          await scopedClient.auth.resetPasswordForEmail(targetUser.email, {
            redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL || undefined,
          });
        } catch (otpErr) {
          console.error("Failed to trigger OTP verification email:", otpErr);
        }
      }

      await writePasswordAuditLog({
        action: 'admin_reset_credentials_otp',
        actorUserId: adminId,
        targetUserId,
        targetEmail: targetUser.email || null,
        outcome: 'success',
        ipAddress,
        userAgent,
        metadata: { admin_role: adminRole, otp_dispatched: true, sessions_revoked: true },
      });

      return res.status(200).json({
        message: "User credentials invalidated and OTP verification dispatched.",
        force_logout: true,
        must_change_password: true,
        otp_dispatched: true,
      });
    }

    let credentialDelivery = null;
    if (generatedPassword) {
      credentialDelivery = await createCredentialDeliveryToken({
        createdBy: adminId,
        targetUserId,
        targetEmail: targetUser.email,
        temporaryPassword: finalPassword,
        metadata: {
          role: targetUser.role,
          institution_id: targetUser.institution_id,
          action: 'admin_reset_password',
        },
      });
    }

    await writePasswordAuditLog({
      action: 'admin_reset_password',
      actorUserId: adminId,
      targetUserId,
      targetEmail: targetUser.email || null,
      outcome: 'success',
      ipAddress,
      userAgent,
      metadata: { admin_role: adminRole, generated_password: generatedPassword },
    });
    res.status(200).json({
      message: "User password has been reset successfully.",
      force_logout: true,
      must_change_password: true,
      requires_security_questions_setup: true,
      generated_password: generatedPassword,
      tempPassword: generatedPassword ? finalPassword : undefined,
      credential_delivery: credentialDelivery,
      credential_document: generatedPassword
        ? buildCredentialDocument({
          fullName: targetUser.full_name,
          role: targetUser.role,
          email: targetUser.email,
          temporaryPassword: finalPassword,
          credentialUrl: credentialDelivery?.url,
          expiresAt: credentialDelivery?.expiresAt,
        })
        : undefined,
    });
  } catch (err) {
    console.error("adminResetPassword error:", err);
    await writePasswordAuditLog({
      action: 'admin_reset_password',
      actorUserId: req.userId || null,
      targetUserId: req.body?.targetUserId || null,
      outcome: 'failure',
      reason: err?.message || 'admin_reset_failed',
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
      metadata: { admin_role: req.userRole || null },
    });
    res.status(500).json({ error: err.message || "Failed to reset user password" });
  }
};


exports.forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { ip_address: ipAddress, user_agent: userAgent } = getRequestContext(req);

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // 0. Rate Limiting Check
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const { data: recentRequests, error: _rateError } = await supabase
      .from('password_reset_requests')
      .select('id')
      .ilike('email', email)
      .gt('requested_at', new Date(Date.now() - 3600000).toISOString()); // Last 1 hour

    if (recentRequests && recentRequests.length >= 3) {
      await writePasswordAuditLog({
        action: 'forgot_password_request',
        targetEmail: email,
        outcome: 'failure',
        reason: 'rate_limit_exceeded',
        ipAddress,
        userAgent,
      });
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
      .ilike("email", email)
      .maybeSingle();

    if (!userData) {
      await writePasswordAuditLog({
        action: 'forgot_password_request',
        targetEmail: email,
        outcome: 'failure',
        reason: 'email_not_found',
        ipAddress,
        userAgent,
      });
      return res.status(404).json({
        error: 'No account exists for this email.',
        code: 'EMAIL_NOT_FOUND',
      });
    }

    await writePasswordAuditLog({
      action: 'forgot_password_request',
      targetUserId: userData.id,
      targetEmail: email,
      outcome: 'requested',
      ipAddress,
      userAgent,
      metadata: { role: userData.role, institution_id: userData.institution_id || null },
    });

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
          await sendBulkInAppNotificationsWithHistory(notifications);
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
            type: 'error',
            data: { target_user_id: userData.id, target_name: userData.full_name, institution_id: userData.institution_id }
          }));
          await sendBulkInAppNotificationsWithHistory(notifications);
        }

        return res.status(200).json({
          message: "Administrative reset requested. Please contact the platform support (Master Admin) to reset your password.",
          is_hierarchical: true
        });
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

    res.status(200).json({ message: "Reset link sent. Please check your inbox." });
  } catch (err) {
    console.error("forgotPassword error:", err);
    await writePasswordAuditLog({
      action: 'forgot_password_request',
      targetEmail: normalizeEmail(req.body?.email) || null,
      outcome: 'failure',
      reason: err?.message || 'forgot_password_failed',
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
    res.status(500).json({ error: err.message || "Failed to process password reset request" });
  }
};

exports.getEnrollmentSlotCapacity = async (req, res) => {
  try {
    const requestedInstitutionId = String(req.query?.institution_id || '').trim();
    const institutionId = req.isPlatformAdmin
      ? (requestedInstitutionId || req.institution_id)
      : req.institution_id;

    if (!institutionId) {
      return res.status(400).json({
        error: 'Institution ID is required',
        code: 'INSTITUTION_REQUIRED',
      });
    }

    const capacity = await getInstitutionSlotCapacity(institutionId);
    return res.status(200).json({
      ...capacity,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('getEnrollmentSlotCapacity error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch slot capacity' });
  }
};

/**
 * List administrators in an institution with main/delegation flags.
 */
exports.getInstitutionAdmins = async (req, res) => {
  try {
    const requesterRole = req.userRole;
    const requesterInstitutionId = req.institution_id;

    if (!['admin', 'master_admin'].includes(requesterRole)) {
      return res.status(403).json({ error: 'Unauthorized. Insufficient permissions.' });
    }

    const requestedInstitutionId = String(req.query?.institution_id || '').trim() || null;
    const targetInstitutionId = requesterRole === 'master_admin'
      ? (requestedInstitutionId || requesterInstitutionId)
      : requesterInstitutionId;

    if (!targetInstitutionId) {
      return res.status(400).json({ error: 'Institution ID is required.' });
    }

    let { data: adminRows, error } = await supabase
      .from('admins')
      .select('user_id, institution_id, is_main, can_manage_users, users:user_id(id, first_name, last_name, full_name, email)')
      .eq('institution_id', targetInstitutionId)
      .order('is_main', { ascending: false });

    if (error && isMissingCanManageUsersColumnError(error)) {
      ({ data: adminRows, error } = await supabase
        .from('admins')
        .select('user_id, institution_id, is_main, users:user_id(id, first_name, last_name, full_name, email)')
        .eq('institution_id', targetInstitutionId)
        .order('is_main', { ascending: false }));
    }

    if (error) throw error;

    const admins = (adminRows || [])
      .map((row) => ({
        user_id: row.user_id,
        institution_id: row.institution_id,
        is_main: !!row.is_main,
        can_manage_users: !!row.can_manage_users,
        user: row.users || null,
      }))
      .filter((row) => !!row.user?.id);

    return res.status(200).json({ admins });
  } catch (err) {
    console.error('getInstitutionAdmins error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch institution administrators' });
  }
};

/**
 * Main admin delegation: grant/revoke user-management capability for another admin.
 */
exports.updateAdminDelegation = async (req, res) => {
  try {
    const requesterRole = req.userRole;
    const requesterInstitutionId = req.institution_id;
    const requesterIsMain = !!req.isMain;
    const { targetAdminUserId, canManageUsers } = req.body || {};

    if (!targetAdminUserId) {
      return res.status(400).json({ error: 'targetAdminUserId is required' });
    }

    if (typeof canManageUsers !== 'boolean') {
      return res.status(400).json({ error: 'canManageUsers must be a boolean' });
    }

    if (!['admin', 'master_admin'].includes(requesterRole)) {
      return res.status(403).json({ error: 'Unauthorized. Insufficient permissions.' });
    }

    if (requesterRole === 'admin' && !requesterIsMain) {
      return res.status(403).json({
        error: 'Only main administrators can grant or revoke delegated user-management permissions.',
        code: 'MAIN_ADMIN_REQUIRED',
      });
    }

    const {
      data: targetAdmin,
      error: targetAdminError,
      delegationColumnMissing,
    } = await fetchAdminRowWithDelegationFallback(targetAdminUserId);

    if (targetAdminError) throw targetAdminError;

    if (!targetAdmin) {
      return res.status(404).json({ error: 'Target administrator not found' });
    }

    if (requesterRole === 'admin' && targetAdmin.institution_id !== requesterInstitutionId) {
      return res.status(403).json({
        error: 'Access denied. Target administrator belongs to a different institution.',
        code: 'CROSS_INSTITUTION_DENIED',
      });
    }

    const nextCanManageUsers = targetAdmin.is_main ? true : !!canManageUsers;

    const { error: updateError } = await updateAdminManageUsersWithFallback(targetAdminUserId, nextCanManageUsers);

    let updatedRow = targetAdmin;
    if (!delegationColumnMissing) {
      const { data: refreshedAdmin, error: refreshedAdminError } = await supabase
        .from('admins')
        .select('user_id, institution_id, is_main, can_manage_users')
        .eq('user_id', targetAdminUserId)
        .single();
      if (refreshedAdminError && !isMissingCanManageUsersColumnError(refreshedAdminError)) {
        throw refreshedAdminError;
      }
      if (refreshedAdmin) {
        updatedRow = refreshedAdmin;
      }
    } else {
      updatedRow = {
        ...targetAdmin,
        can_manage_users: nextCanManageUsers,
      };
    }

    if (updateError) throw updateError;

    return res.status(200).json({
      message: 'Delegated user-management permission updated successfully.',
      admin: updatedRow,
    });
  } catch (err) {
    console.error('updateAdminDelegation error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update delegation settings' });
  }
};

/**
 * Lightweight endpoint for forgot-password email existence checks.
 */
exports.checkPasswordRecoveryEmail = async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const { data: userRow, error } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (error) throw error;

    return res.status(200).json({
      exists: !!userRow,
      email,
      can_request_reset: !!userRow,
      message: userRow ? 'Email found.' : 'No account exists for this email.',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to verify email' });
  }
};

/**
 * Reset password using access token from reset email
 */
exports.resetPassword = async (req, res) => {
  try {
    const { access_token, new_password } = req.body;
    const { ip_address: ipAddress, user_agent: userAgent } = getRequestContext(req);

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
      await writePasswordAuditLog({
        action: 'reset_password',
        outcome: 'failure',
        reason: 'invalid_or_expired_reset_token',
        ipAddress,
        userAgent,
      });
      return res.status(401).json({ error: "Invalid or expired reset token" });
    }

    // Update password via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (updateError) throw updateError;

    await supabase
      .from('users')
      .update({
        must_change_password: false,
        requires_security_questions_setup: false,
      })
      .eq('id', user.id);

    await revokeAllUserSessions(user.id);

    await writePasswordAuditLog({
      action: 'reset_password',
      actorUserId: user.id,
      targetUserId: user.id,
      targetEmail: normalizeEmail(user.email) || null,
      outcome: 'success',
      ipAddress,
      userAgent,
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("resetPassword error:", err);
    await writePasswordAuditLog({
      action: 'reset_password',
      outcome: 'failure',
      reason: err?.message || 'reset_password_failed',
      ipAddress: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
      userAgent: req?.headers?.['user-agent'] || null,
    });
    res.status(500).json({ error: err.message || "Failed to reset password" });
  }
};

/**
 * Setup or update security questions for authenticated user.
 */
exports.setupSecurityQuestions = async (req, res) => {
  try {
    const userId = req.userId;
    const { selected_question_key, selected_question_answer } = req.body || {};

    if (!isValidSecurityQuestionKey(selected_question_key)) {
      return res.status(400).json({ error: 'A valid security question selection is required' });
    }

    const normalizedAnswer = normalizeSecurityAnswer(selected_question_answer);

    if (!normalizedAnswer) {
      return res.status(400).json({ error: 'Security answer cannot be empty' });
    }

    const s1 = crypto.randomBytes(16).toString('hex');
    const unusedSalt = crypto.randomBytes(16).toString('hex');

    const payload = {
      user_id: userId,
      question1_salt: s1,
      question1_hash: hashSecurityAnswer(normalizedAnswer, s1),
      question2_salt: encodeSecurityQuestionKey(selected_question_key),
      question2_hash: hashSecurityAnswer(`unused:${unusedSalt}`, unusedSalt),
      question3_salt: unusedSalt,
      question3_hash: hashSecurityAnswer(`unused:${unusedSalt}:2`, unusedSalt),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_security_answers')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;

    await supabase
      .from('users')
      .update({ requires_security_questions_setup: false })
      .eq('id', userId);

    return res.status(200).json({
      message: 'Security question saved successfully',
      selected_question_key,
      selected_question_prompt: SECURITY_QUESTIONS[selected_question_key],
    });
  } catch (err) {
    console.error('setupSecurityQuestions error:', err);
    return res.status(500).json({ error: err.message || 'Failed to save security questions' });
  }
};

/**
 * Complete first-login credential setup atomically at API level.
 *
 * This endpoint is only valid while both first-login flags are active:
 * - must_change_password = true
 * - requires_security_questions_setup = true
 *
 * Note: Supabase Auth password update and Postgres writes are separate systems,
 * so strict database-level atomicity is not possible. This endpoint enforces
 * a single orchestration flow with explicit partial-failure reporting.
 */
exports.completeCredentialSetup = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      selected_question_key,
      selected_question_answer,
      new_password,
    } = req.body || {};
    const { ip_address: ipAddress, user_agent: userAgent } = getRequestContext(req);

    if (!isValidSecurityQuestionKey(selected_question_key)) {
      return res.status(400).json({ error: 'A valid security question selection is required' });
    }

    const normalizedAnswer = normalizeSecurityAnswer(selected_question_answer);
    if (!normalizedAnswer) {
      return res.status(400).json({ error: 'Security answer cannot be empty' });
    }

    if (!new_password || String(new_password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, must_change_password, requires_security_questions_setup')
      .eq('id', userId)
      .maybeSingle();

    if (userError) throw userError;
    if (!userRow) return res.status(404).json({ error: 'User not found' });

    const inFirstLoginSetupState = !!userRow.must_change_password && !!userRow.requires_security_questions_setup;
    if (!inFirstLoginSetupState) {
      return res.status(409).json({
        error: 'Credential setup is not required for this account',
        code: 'CREDENTIAL_SETUP_NOT_REQUIRED',
      });
    }

    // Step 1: Update password first. If this fails, no DB setup state mutates.
    const { error: passwordUpdateError } = await supabase.auth.admin.updateUserById(userId, {
      password: String(new_password),
    });
    if (passwordUpdateError) throw passwordUpdateError;

    // Step 2: Persist selected security question answer hash.
    const s1 = crypto.randomBytes(16).toString('hex');
    const unusedSalt = crypto.randomBytes(16).toString('hex');
    const payload = {
      user_id: userId,
      question1_salt: s1,
      question1_hash: hashSecurityAnswer(normalizedAnswer, s1),
      question2_salt: encodeSecurityQuestionKey(selected_question_key),
      question2_hash: hashSecurityAnswer(`unused:${unusedSalt}`, unusedSalt),
      question3_salt: unusedSalt,
      question3_hash: hashSecurityAnswer(`unused:${unusedSalt}:2`, unusedSalt),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('user_security_answers')
      .upsert(payload, { onConflict: 'user_id' });

    if (upsertError) {
      await writePasswordAuditLog({
        action: 'change_password',
        actorUserId: userId,
        targetUserId: userId,
        targetEmail: normalizeEmail(userRow.email),
        outcome: 'failure',
        reason: 'credential_setup_partial_security_question_failed',
        ipAddress,
        userAgent,
      });

      return res.status(500).json({
        error: 'Password updated, but security question setup failed. Please retry setup.',
        code: 'CREDENTIAL_SETUP_PARTIAL_PASSWORD_UPDATED',
      });
    }

    const { error: updateFlagsError } = await supabase
      .from('users')
      .update({
        must_change_password: false,
        requires_security_questions_setup: false,
      })
      .eq('id', userId);

    if (updateFlagsError) {
      await writePasswordAuditLog({
        action: 'change_password',
        actorUserId: userId,
        targetUserId: userId,
        targetEmail: normalizeEmail(userRow.email),
        outcome: 'failure',
        reason: 'credential_setup_partial_flags_update_failed',
        ipAddress,
        userAgent,
      });

      return res.status(500).json({
        error: 'Password and security question were saved, but setup state update failed. Please retry once.',
        code: 'CREDENTIAL_SETUP_PARTIAL_FLAGS_NOT_CLEARED',
      });
    }

    await writePasswordAuditLog({
      action: 'change_password',
      actorUserId: userId,
      targetUserId: userId,
      targetEmail: normalizeEmail(userRow.email),
      outcome: 'success',
      reason: 'credential_setup_completed',
      ipAddress,
      userAgent,
    });

    return res.status(200).json({
      message: 'Security question and password updated successfully',
      selected_question_key,
      selected_question_prompt: SECURITY_QUESTIONS[selected_question_key],
    });
  } catch (err) {
    console.error('completeCredentialSetup error:', err);
    return res.status(500).json({ error: 'Failed to complete credential setup' });
  }
};

/**
 * Verify security questions and optionally reset password.
 */
exports.verifySecurityQuestions = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { selected_question_answer, new_password } = req.body || {};
    const { ip_address: ipAddress, user_agent: userAgent } = getRequestContext(req);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: userRow } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (!userRow) {
      return res.status(404).json({ verified: false, message: 'No account exists for this email' });
    }

    const { data: answers, error: answersError } = await supabase
      .from('user_security_answers')
      .select('*')
      .eq('user_id', userRow.id)
      .maybeSingle();

    if (answersError || !answers) {
      return res.status(200).json({ verified: false, message: 'Security questions are not configured for this account' });
    }

    const selectedQuestionKey = getStoredSecurityQuestionKey(answers);
    const selectedQuestionPrompt = SECURITY_QUESTIONS[selectedQuestionKey];

    if (!selected_question_answer) {
      const failedAttempts = await getSecurityQuestionAttemptCount({ email, userId: userRow.id });
      const attemptsRemaining = Math.max(0, 3 - failedAttempts);
      return res.status(200).json({
        verified: false,
        requires_answer: true,
        selected_question_key: selectedQuestionKey,
        selected_question_prompt: selectedQuestionPrompt,
        attempts_remaining: attemptsRemaining,
        message: attemptsRemaining > 0
          ? 'Provide your selected security question answer'
          : 'Maximum attempts reached. Try again in one hour.',
      });
    }

    const failedAttempts = await getSecurityQuestionAttemptCount({ email, userId: userRow.id });
    if (failedAttempts >= 3) {
      return res.status(429).json({
        verified: false,
        code: 'SECURITY_ATTEMPTS_LIMIT',
        attempts_remaining: 0,
        message: 'Maximum attempts reached. Try again in one hour.',
      });
    }

    const isValid = hashSecurityAnswer(selected_question_answer, answers.question1_salt) === answers.question1_hash;

    if (!isValid) {
      await writePasswordAuditLog({
        action: 'forgot_password_request',
        targetUserId: userRow.id,
        targetEmail: normalizeEmail(userRow.email),
        outcome: 'failure',
        reason: 'security_question_attempt_failed',
        ipAddress,
        userAgent,
      });

      const updatedFailedAttempts = await getSecurityQuestionAttemptCount({ email, userId: userRow.id });
      const attemptsRemaining = Math.max(0, 3 - updatedFailedAttempts);

      return res.status(200).json({
        verified: false,
        selected_question_key: selectedQuestionKey,
        selected_question_prompt: selectedQuestionPrompt,
        attempts_remaining: attemptsRemaining,
        message: attemptsRemaining > 0
          ? `Incorrect answer. ${attemptsRemaining} attempt(s) remaining this hour.`
          : 'Maximum attempts reached. Try again in one hour.',
      });
    }

    if (new_password) {
      if (new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(userRow.id, {
        password: new_password,
      });
      if (updateError) throw updateError;

      await supabase
        .from('users')
        .update({
          must_change_password: false,
          requires_security_questions_setup: false,
        })
        .eq('id', userRow.id);

      await revokeAllUserSessions(userRow.id);

      await writePasswordAuditLog({
        action: 'reset_password',
        actorUserId: userRow.id,
        targetUserId: userRow.id,
        targetEmail: normalizeEmail(userRow.email),
        outcome: 'success',
        reason: 'security_questions_verified',
        ipAddress,
        userAgent,
      });
    }

    return res.status(200).json({
      verified: true,
      selected_question_key: selectedQuestionKey,
      selected_question_prompt: selectedQuestionPrompt,
      attempts_remaining: 3,
      message: new_password
        ? 'Security verification complete and password updated'
        : 'Security verification complete',
    });
  } catch (err) {
    console.error('verifySecurityQuestions error:', err);
    return res.status(500).json({ error: err.message || 'Failed to verify security questions' });
  }
};

/**
 * One-time credential delivery endpoint.
 */
exports.getCredentialDeliveryByToken = async (req, res) => {
  try {
    const token = req.params?.token;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const { data: row, error } = await supabase
      .from('credential_delivery_tokens')
      .select('id, target_email, temporary_password, expires_at, consumed_at')
      .eq('token', token)
      .maybeSingle();

    if (error || !row) {
      return res.status(404).json({ error: 'Credential token is invalid' });
    }

    const now = Date.now();
    const expiresAtMs = new Date(row.expires_at).getTime();

    if (row.consumed_at) {
      return res.status(410).json({ error: 'Credential token has already been used' });
    }

    if (Number.isFinite(expiresAtMs) && now > expiresAtMs) {
      return res.status(410).json({ error: 'Credential token has expired' });
    }

    await supabase
      .from('credential_delivery_tokens')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', row.id);

    return res.status(200).json({
      email: row.target_email,
      temporary_password: row.temporary_password,
      consumed: true,
    });
  } catch (err) {
    console.error('getCredentialDeliveryByToken error:', err);
    return res.status(500).json({ error: err.message || 'Failed to load credentials' });
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

    const { data: currentAdminRow, error: currentAdminError } = await supabase
      .from('admins')
      .select('institution_id, is_main')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (currentAdminError) throw currentAdminError;
    if (!currentAdminRow || !currentAdminRow.is_main) {
      return res.status(403).json({ error: 'Only current main admin can transfer ownership.' });
    }

    const { data: targetAdminRow, error: targetAdminError } = await supabase
      .from('admins')
      .select('institution_id')
      .eq('user_id', targetAdminUserId)
      .maybeSingle();

    if (targetAdminError) throw targetAdminError;
    if (!targetAdminRow || targetAdminRow.institution_id !== currentAdminRow.institution_id) {
      return res.status(400).json({ error: 'Recipient must be an admin in the same institution.' });
    }

    const { error } = await supabase.rpc('transfer_main_admin_status', {
      p_old_admin_user_id: currentUserId,
      p_new_admin_user_id: targetAdminUserId
    });

    if (error) throw error;

    const { error: permissionUpdateError } = await updateAdminManageUsersWithFallback(currentUserId, false);
    if (permissionUpdateError) throw permissionUpdateError;

    const { error: targetPermissionUpdateError } = await updateAdminManageUsersWithFallback(targetAdminUserId, true);
    if (targetPermissionUpdateError) throw targetPermissionUpdateError;

    res.json({ message: "Main Admin status transferred successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all active sessions for the current user
 */
exports.getActiveSessions = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const currentSessionId = req.sessionId;

    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', currentUserId)
      .eq('is_revoked', false)
      .gt('expires_at', new Date().toISOString())
      .order('last_active_at', { ascending: false });

    if (error) throw error;

    // Filter out sessions that have exceeded the idle timeout
    const now = Date.now();
    const activeSessions = [];

    for (const session of sessions) {
      const lastActive = new Date(session.last_active_at).getTime();
      if (now - lastActive > IDLE_TIMEOUT_MS) {
        // Automatically mark as revoked/expired in the background
        (async () => {
          try {
            const { error: revokeErr } = await supabase.from('user_sessions')
              .update({ is_revoked: true })
              .eq('id', session.id);
            if (revokeErr) {
              console.error("Error auto-revoking idle session in controller:", revokeErr.message);
            }
          } catch (e) {
            console.error("Error auto-revoking idle session in controller:", e.message);
          }
        })();
      } else {
        const parsed = parseUserAgent(session.user_agent);
        const normalizedDevice = parsed.displayName;
        const normalizedOs = parsed.osName;

        activeSessions.push({
          id: session.id,
          device_type: normalizedDevice,
          os_name: normalizedOs,
          ip_address: session.ip_address,
          location: session.location,
          login_at: session.login_at,
          last_active_at: session.last_active_at,
          is_current: session.session_id === currentSessionId
        });
      }
    }

    res.json(activeSessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Revoke a specific session
 */
exports.revokeSession = async (req, res) => {
  try {
    const { id } = req.body;
    const currentUserId = req.userId;

    if (!id) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const { error } = await supabase
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('id', id)
      .eq('user_id', currentUserId);

    if (error) throw error;

    res.json({ message: "Session revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Revoke all sessions except the current one
 */
exports.revokeAllOtherSessions = async (req, res) => {
  try {
    const currentUserId = req.userId;
    const currentSessionId = req.sessionId;

    if (!currentSessionId) {
      return res.status(400).json({ error: "No active session ID" });
    }

    const { error } = await supabase
      .from('user_sessions')
      .update({ is_revoked: true })
      .eq('user_id', currentUserId)
      .neq('session_id', currentSessionId);

    if (error) throw error;

    res.json({ message: "All other sessions revoked successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Simple ping endpoint to reset backend last_active_at timer
 */
exports.pingSession = async (req, res) => {
  // Middleware handles updating last_active_at automatically
  res.json({ success: true });
};

