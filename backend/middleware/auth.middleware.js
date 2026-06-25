const supabase = require("../utils/supabaseClient.js");
const { canonicalRoleFrom } = require("../utils/roleAlias.js");

// Simple in-memory cache for profiles: userId -> { profile, timestamp }
const profileCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function decodeJwtPayload(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) return null;
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function parseUserAgent(userAgent) {
  const ua = (userAgent || '').toLowerCase();

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
    browser,
    osName,
    deviceType,
    displayName: `${browser} on ${deviceType}`,
  };
}

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  const rawIp = forwarded || req?.socket?.remoteAddress || '127.0.0.1';
  return String(rawIp).split(',')[0].trim();
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      console.warn("[AuthMiddleware] No token provided for:", req.url);
      return res.status(401).json({ error: "No token provided" });
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error(`[AuthMiddleware] Supabase auth error for ${req.url}:`, error?.message || "Invalid user");
      return res.status(401).json({ error: "Invalid token" });
    }

    // Decode session_id from JWT payload
    let sessionId = null;
    let tokenIssuedAt = null;
    try {
      const payload = decodeJwtPayload(token);
      if (payload) {
        sessionId = payload.session_id;
        tokenIssuedAt = payload.iat;
      }
    } catch (e) {
      console.error("[AuthMiddleware] Token payload decode error:", e.message);
    }

    if (sessionId) {
      // Fetch session from user_sessions table
      const { data: sessionRow, error: sessionErr } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (sessionErr) {
        console.error("[AuthMiddleware] Error fetching session:", sessionErr.message);
      }

      const now = Date.now();

      if (sessionRow) {
        // Enforce revocation
        if (sessionRow.is_revoked) {
          console.warn(`[AuthMiddleware] Revoked session access attempt: ${sessionId}`);
          return res.status(401).json({ error: "Session has been revoked", code: "SESSION_REVOKED" });
        }

        // Enforce absolute timeout (10 hours)
        const expiresAt = new Date(sessionRow.expires_at).getTime();
        if (now > expiresAt) {
          console.warn(`[AuthMiddleware] Session absolute timeout exceeded: ${sessionId}`);
          await supabase.from('user_sessions').update({ is_revoked: true }).eq('session_id', sessionId);
          return res.status(401).json({ error: "Session expired", code: "SESSION_TIMEOUT" });
        }

        // Enforce idle timeout (30 minutes)
        const lastActive = new Date(sessionRow.last_active_at).getTime();
        if (now - lastActive > IDLE_TIMEOUT_MS) {
          console.warn(`[AuthMiddleware] Session idle timeout exceeded: ${sessionId}`);
          await supabase.from('user_sessions').update({ is_revoked: true }).eq('session_id', sessionId);
            return res.status(401).json({ error: "You've been logged out due to inactivity.", code: "SESSION_IDLE_TIMEOUT" });
        }

        // Valid session: update last_active_at (throttled to once every 30 seconds)
        if (now - lastActive > 30000) {
          try {
            const { error: updateErr } = await supabase
              .from('user_sessions')
              .update({ last_active_at: new Date().toISOString() })
              .eq('session_id', sessionId);
            if (updateErr) {
              console.error("Error updating last active time:", updateErr.message);
            }
          } catch (e) {
            console.error("Error updating last active time:", e.message);
          }
        }
      } else {
        // Session not in user_sessions yet. Register it!
        const loginAt = tokenIssuedAt ? new Date(tokenIssuedAt * 1000) : new Date();
        const expiresAt = new Date(loginAt.getTime() + 10 * 60 * 60 * 1000); // 10 hours absolute limit
        const userAgent = req.headers['user-agent'] || '';

        const fingerprint = parseUserAgent(userAgent);
        const ipAddress = getClientIp(req);

        // Resolve location and register session asynchronously
        const resolveAndRegister = async () => {
          let location = 'Unknown Location';
          const cleanIp = ipAddress;
          if (cleanIp !== '::1' && cleanIp !== '127.0.0.1' && !cleanIp.startsWith('192.168.') && !cleanIp.startsWith('10.')) {
            try {
              const resLoc = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,message,country,city`);
              const dataLoc = await resLoc.json();
              if (dataLoc?.status === 'success') {
                location = `${dataLoc.city}, ${dataLoc.country}`;
              }
            } catch (e) {
              console.warn("Location lookup failed", e.message);
            }
          } else {
            location = 'Local Network';
          }

          try {
            const { error: insertErr } = await supabase
              .from('user_sessions')
              .insert({
                user_id: user.id,
                session_id: sessionId,
                user_agent: userAgent,
                device_type: fingerprint.displayName,
                os_name: fingerprint.osName,
                ip_address: cleanIp,
                location,
                login_at: loginAt.toISOString(),
                last_active_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                is_revoked: false
              });
            if (insertErr) {
              console.error("[AuthMiddleware] Session registration error:", insertErr.message);
            }
          } catch (err) {
            console.error("[AuthMiddleware] Session registration unexpected error:", err.message);
          }
        };

        resolveAndRegister();
      }
    }

    // Attach sessionId to request
    req.sessionId = sessionId;

    // --- Demo User Enforcement ---
    // If the user is a demo user, we MUST enforce the 15-minute limit
    // regardless of the global Supabase JWT expiry setting.
    if (user.email && user.email.startsWith('demo.')) {
      const { data: trialSessions, error: trialError } = await supabase
        .from('trial_sessions')
        .select('expires_at')
        .eq('demo_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const trialSession = trialSessions?.[0];

      if (trialError || !trialSession) {
        console.warn(`[AuthMiddleware] No trial session found for demo user: ${user.id}`);
        return res.status(401).json({ error: "Trial session missing or expired" });
      }

      const expiresAt = new Date(trialSession.expires_at).getTime();
      if (Date.now() > expiresAt) {
        console.log(`[AuthMiddleware] Trial session expired for demo user: ${user.id}`);
        // Clean up if expired
        await supabase.from('trial_sessions').delete().eq('demo_user_id', user.id).catch(() => { });
        return res.status(401).json({ error: "Trial session has expired" });
      }
    }
    // ----------------------------

    // Check cache first
    const cached = profileCache.get(user.id);
    const now = Date.now();
    let profile;

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      profile = cached.profile;
    } else {
      // Query the extended profile from 'users' table (which includes platform_admins join if applicable)
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*, admins(id, is_main), platform_admins(id)')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.error(`[AuthMiddleware] Profile fetch error for ${user.id}:`, profileError?.message);
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Determine if platform admin
      let isPlatformAdmin = profileData.role === 'master_admin';

      // Fallback/Legacy check just in case
      if (!isPlatformAdmin && profileData.role === 'admin' && !profileData.institution_id) {
        // The new select statement already includes platform_admins(id)
        if (profileData.platform_admins && profileData.platform_admins.length > 0) {
          isPlatformAdmin = true;
        }
      }

      const isMain = profileData.admins?.[0]?.is_main || false;

      // Query custom roles and permissions
      const { data: userRolesData } = await supabase
        .from('user_roles')
        .select(`
          roles (
            name,
            role_permissions (
              permissions (
                name
              )
            )
          )
        `)
        .eq('user_id', user.id);

      const customRoles = [];
      const permissions = [];

      if (userRolesData) {
        userRolesData.forEach(ur => {
          if (ur.roles) {
            customRoles.push(ur.roles.name);
            if (ur.roles.role_permissions) {
              ur.roles.role_permissions.forEach(rp => {
                if (rp.permissions) {
                  permissions.push(rp.permissions.name);
                }
              });
            }
          }
        });
      }

      profile = {
        id: profileData.id,
        email: profileData.email,
        institution_id: profileData.institution_id,
        role: profileData.role,
        must_change_password: !!profileData.must_change_password,
        requires_security_questions_setup: !!profileData.requires_security_questions_setup,
        role_alias: canonicalRoleFrom(profileData.role, isPlatformAdmin),
        is_main: isMain,
        isPlatformAdmin: isPlatformAdmin,
        customRoles,
        permissions
      };

      // Update cache
      profileCache.set(user.id, { profile, timestamp: now });

      // Periodic cache cleanup (crude)
      if (profileCache.size > 1000) {
        const fiveMinsAgo = now - (300000);
        for (const [key, val] of profileCache.entries()) {
          if (val.timestamp < fiveMinsAgo) profileCache.delete(key);
        }
      }
    }

    // Add user info to request object
    req.user = {
      id: profile.id,
      email: profile.email,
      institution_id: profile.institution_id,
      role: profile.role,
      role_alias: profile.role_alias,
      must_change_password: !!profile.must_change_password,
      requires_security_questions_setup: !!profile.requires_security_questions_setup,
      roles: profile.customRoles || [],
      permissions: profile.permissions || [],
      is_main: profile.is_main || false,
      is_platform_admin: profile.isPlatformAdmin || false
    };

    // Convenience shorthands (ensure always set)
    // Defensive: Convert literal "null" strings to primitive null
    const sanitizeId = (id) => (id === "null" || id === "" ? null : id);

    req.institution_id = sanitizeId(profile.institution_id);
    req.userId = sanitizeId(profile.id);
    req.userRole = profile.role || null;
    req.isMain = req.user.is_main;
    req.isPlatformAdmin = req.user.is_platform_admin;

    // First-login enforcement gate: force password update and security setup
    // before allowing access to broader application endpoints.
    if (req.user.must_change_password || req.user.requires_security_questions_setup) {
      const path = req.originalUrl || req.path || '';
      const method = (req.method || 'GET').toUpperCase();
      const allowed = [
        '/api/auth/change-password',
        '/api/auth/security-questions/setup',
        '/api/auth/logout',
        '/api/auth/ping',
        '/change-password',
        '/security-questions/setup',
        '/logout',
        '/ping',
      ];

      const isAllowed = allowed.some((p) => path.startsWith(p));
      if (!isAllowed) {
        return res.status(428).json({
          error: 'Password change required before continuing',
          code: 'MUST_CHANGE_PASSWORD',
          allow: allowed,
          method,
        });
      }
    }

    // Defensive: fallback if somehow missing
    if (!req.userRole) {
      console.error('[AuthMiddleware] userRole missing for user:', profile.id);
      return res.status(403).json({ error: "User role not found in profile" });
    }

    next();
  } catch (err) {
    console.error("authMiddleware unexpected error:", err);
    return res.status(500).json({ error: "Authorization failed" });
  }
}

module.exports = { authMiddleware };
