const supabase = require("../utils/supabaseClient.js");
const { compilePdfBuffer } = require("../services/pdfCompiler.service.js");

// Matrix defining valid clearance reasons per user role
const VALID_ROLE_REASONS = {
  student: ["graduation", "withdrawal", "transferred", "expulsion"],
  teacher: ["resignation", "contract_ended", "terminated"],
  admin: ["resignation", "contract_ended", "terminated"],
};

/**
 * Step 1: Check Eligibility & Validate Role-Reason Matrix
 */
exports.checkEligibility = async (req, res) => {
  try {
    const { user_ids, reason_category } = req.body;
    const institution_id = req.institution_id;
    const userRole = req.user.role;

    if (!Array.isArray(user_ids) || user_ids.length === 0 || !reason_category) {
      return res.status(400).json({ error: "user_ids array and reason_category are required" });
    }

    // Expulsion and Termination can only be initiated by Admin / Master Admin
    const isAdmin = userRole === "admin" || userRole === "master_admin";
    if (["expulsion", "terminated"].includes(reason_category) && !isAdmin) {
      return res.status(403).json({ error: `Only administrators can initiate ${reason_category}` });
    }

    const results = [];
    let hasInvalid = false;

    for (const uid of user_ids) {
      // 1. Fetch user record
      const { data: userRow, error: uErr } = await supabase
        .from("users")
        .select("id, full_name, email, role, status, is_active, institution_id")
        .eq("id", uid)
        .eq("institution_id", institution_id)
        .single();

      if (uErr || !userRow) {
        results.push({
          user_id: uid,
          valid: false,
          error: "User not found in this institution",
        });
        hasInvalid = true;
        continue;
      }

      const role = userRow.role;
      const allowedReasons = VALID_ROLE_REASONS[role] || [];

      // 2. Validate reason against role
      if (!allowedReasons.includes(reason_category)) {
        results.push({
          user_id: uid,
          full_name: userRow.full_name,
          role,
          valid: false,
          error: `Reason "${reason_category}" is not valid for role "${role}". Allowed: ${allowedReasons.join(", ")}`,
        });
        hasInvalid = true;
        continue;
      }

      // 3. If reason is graduation: must be a student and enrolled in final level class
      if (reason_category === "graduation") {
        const { data: studentRow } = await supabase
          .from("students")
          .select("id, class_id, grade_level, form_level, class:classes(id, display_name, is_final_level)")
          .eq("user_id", uid)
          .single();

        const isFinal = studentRow?.class?.is_final_level === true;
        if (!isFinal) {
          results.push({
            user_id: uid,
            full_name: userRow.full_name,
            role,
            valid: false,
            error: `Graduation is only permitted for students enrolled in the institution's designated final/graduating level. Current class: ${studentRow?.class?.display_name || "Unassigned"}`,
          });
          hasInvalid = true;
          continue;
        }
      }

      // 4. Concurrency check: check if user already has an active clearance process
      const { data: activeClearance } = await supabase
        .from("clearance_processes")
        .select("id, initiated_by, current_step, status, reason_category, allow_user_continuation")
        .eq("institution_id", institution_id)
        .eq("user_id", uid)
        .eq("status", "in_progress")
        .maybeSingle();

      if (activeClearance) {
        results.push({
          user_id: uid,
          full_name: userRow.full_name,
          role,
          valid: false,
          has_active_process: true,
          active_clearance: activeClearance,
          error: `User already has an active clearance process in progress (initiated by ${activeClearance.initiated_by})`,
        });
        hasInvalid = true;
        continue;
      }

      results.push({
        user_id: uid,
        full_name: userRow.full_name,
        email: userRow.email,
        role,
        valid: true,
      });
    }

    res.json({
      eligible: !hasInvalid,
      reason_category,
      results,
    });
  } catch (err) {
    console.error("checkEligibility error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Step 2: Check Category Status Independently (Library, Finance, Property)
 */
exports.checkCategoryStatus = async (req, res) => {
  try {
    const { user_id } = req.body;
    const institution_id = req.institution_id;

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    const { data: userRow, error: uErr } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", user_id)
      .eq("institution_id", institution_id)
      .single();

    if (uErr || !userRow) {
      return res.status(404).json({ error: "User not found" });
    }

    const role = userRow.role;
    let studentId = null;
    let teacherId = null;

    if (role === "student") {
      const { data: s } = await supabase
        .from("students")
        .select("id, fee_balance")
        .eq("user_id", user_id)
        .maybeSingle();
      studentId = s?.id;
    } else if (role === "teacher") {
      const { data: t } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user_id)
        .maybeSingle();
      teacherId = t?.id;
    }

    // 1. Library Check (unreturned borrowed books)
    let libQuery = supabase
      .from("borrowed_books")
      .select("id, book_id, borrowed_at, due_date, status, book:books(title, isbn)")
      .eq("institution_id", institution_id)
      .is("returned_at", null)
      .neq("status", "returned");

    if (studentId) libQuery = libQuery.eq("student_id", studentId);
    else if (teacherId) libQuery = libQuery.eq("teacher_id", teacherId);
    else libQuery = libQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // No loans for non-student/teacher

    const { data: unreturnedBooks } = await libQuery;
    const libraryCleared = !unreturnedBooks || unreturnedBooks.length === 0;

    // 2. Finance Check
    let financeCleared = true;
    let feeBalance = 0;
    if (role === "student") {
      const { data: studentRec } = await supabase
        .from("students")
        .select("fee_balance")
        .eq("user_id", user_id)
        .maybeSingle();

      feeBalance = studentRec?.fee_balance ? Number(studentRec.fee_balance) : 0;
      financeCleared = feeBalance <= 0;
    }

    // 3. Property & Equipment Check
    // Default to true unless existing clearance process recorded outstanding property issues
    const { data: existingProcess } = await supabase
      .from("clearance_processes")
      .select("property_cleared, property_notes")
      .eq("institution_id", institution_id)
      .eq("user_id", user_id)
      .eq("status", "in_progress")
      .maybeSingle();

    const propertyCleared = existingProcess ? existingProcess.property_cleared : true;

    res.json({
      user_id,
      role,
      library: {
        cleared: libraryCleared,
        unreturned_count: (unreturnedBooks || []).length,
        items: unreturnedBooks || [],
      },
      finance: {
        cleared: financeCleared,
        balance: feeBalance,
      },
      property: {
        cleared: propertyCleared,
        notes: existingProcess?.property_notes || null,
      },
      all_cleared: libraryCleared && financeCleared && propertyCleared,
    });
  } catch (err) {
    console.error("checkCategoryStatus error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Step 3: Initiate Clearance Process (Admin, Student, Parent, Teacher)
 */
exports.initiateClearance = async (req, res) => {
  try {
    const {
      user_ids,
      reason_category,
      reason_details,
      allow_user_continuation,
    } = req.body;
    const institution_id = req.institution_id;
    const currentUser = req.user;

    const targetUserIds = Array.isArray(user_ids) ? user_ids : [user_ids].filter(Boolean);
    if (targetUserIds.length === 0 || !reason_category) {
      return res.status(400).json({ error: "user_ids and reason_category are required" });
    }

    const isAdmin = currentUser.role === "admin" || currentUser.role === "master_admin";
    let initiatedBy = "self";
    if (isAdmin) {
      initiatedBy = "admin";
    } else if (currentUser.role === "parent") {
      initiatedBy = "parent";
    }

    // Role-specific check
    if (["expulsion", "terminated"].includes(reason_category) && !isAdmin) {
      return res.status(403).json({ error: `Only administrators can initiate ${reason_category}` });
    }

    const createdProcesses = [];

    for (const uid of targetUserIds) {
      // Fetch target user
      const { data: targetUser, error: uErr } = await supabase
        .from("users")
        .select("id, role, full_name")
        .eq("id", uid)
        .eq("institution_id", institution_id)
        .single();

      if (uErr || !targetUser) {
        return res.status(404).json({ error: `User ${uid} not found in this institution` });
      }

      // Check concurrency: if active exists
      const { data: existingActive } = await supabase
        .from("clearance_processes")
        .select("*")
        .eq("institution_id", institution_id)
        .eq("user_id", uid)
        .eq("status", "in_progress")
        .maybeSingle();

      if (existingActive) {
        // Concurrency rule: if user/parent sees existing active, return it for continuation
        if (!isAdmin && (initiatedBy === "self" || initiatedBy === "parent")) {
          // If initiated by admin and allow_user_continuation is false, forbid
          if (existingActive.initiated_by === "admin" && !existingActive.allow_user_continuation) {
            return res.status(403).json({
              error: "An administrative clearance process has been initiated for this account. Please contact your administrator.",
            });
          }
          return res.json({
            message: "Clearance process already in progress. Resuming active process.",
            process: existingActive,
            resumed: true,
          });
        }

        return res.status(400).json({
          error: `An active clearance process is already in progress for ${targetUser.full_name}`,
        });
      }

      // Graduation constraint
      if (reason_category === "graduation") {
        const { data: studentRow } = await supabase
          .from("students")
          .select("id, class:classes(id, is_final_level)")
          .eq("user_id", uid)
          .single();

        if (!studentRow?.class?.is_final_level) {
          return res.status(400).json({
            error: "Graduation clearance is only available for students in the institution's designated final level.",
          });
        }
      }

      // Initial category statuses
      const { data: unreturned } = await supabase
        .from("borrowed_books")
        .select("id")
        .eq("institution_id", institution_id)
        .is("returned_at", null)
        .neq("status", "returned");

      // Insert clearance record
      const { data: newProcess, error: insertErr } = await supabase
        .from("clearance_processes")
        .insert({
          institution_id,
          user_id: uid,
          user_role: targetUser.role,
          initiated_by: initiatedBy,
          initiator_user_id: currentUser.id,
          reason_category,
          reason_details: reason_details || {},
          current_step: 2, // Step 1 complete, proceed to checks
          status: "in_progress",
          allow_user_continuation: initiatedBy === "admin" ? Boolean(allow_user_continuation) : true,
          library_cleared: false,
          finance_cleared: false,
          property_cleared: false,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      createdProcesses.push(newProcess);
    }

    res.status(201).json({
      message: "Clearance process initiated successfully",
      processes: createdProcesses,
      process: createdProcesses[0],
    });
  } catch (err) {
    console.error("initiateClearance error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get Active Clearance for Current User or Child
 */
exports.getActiveClearance = async (req, res) => {
  try {
    const institution_id = req.institution_id;
    const currentUser = req.user;
    const targetUserId = req.query.user_id || currentUser.id;

    // If viewing someone else, must be admin or their parent
    if (targetUserId !== currentUser.id && currentUser.role !== "admin" && currentUser.role !== "master_admin") {
      if (currentUser.role === "parent") {
        // Verify target is child
        const { data: link } = await supabase
          .from("parent_students")
          .select("id, student:students!inner(user_id)")
          .eq("parent_id", currentUser.id)
          .eq("student.user_id", targetUserId)
          .maybeSingle();

        if (!link) {
          return res.status(403).json({ error: "Unauthorized access to student clearance" });
        }
      } else {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    const { data: clearance, error } = await supabase
      .from("clearance_processes")
      .select("*, user:users!clearance_processes_user_id_fkey(id, full_name, email, role)")
      .eq("institution_id", institution_id)
      .eq("user_id", targetUserId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (error) throw error;

    res.json({
      active: Boolean(clearance),
      clearance: clearance || null,
    });
  } catch (err) {
    console.error("getActiveClearance error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update Clearance Step & Category Details
 */
exports.updateClearanceStep = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      current_step,
      reason_details,
      library_cleared,
      library_notes,
      finance_cleared,
      finance_notes,
      property_cleared,
      property_notes,
      admin_override,
      override_reason,
    } = req.body;
    const institution_id = req.institution_id;
    const currentUser = req.user;

    const { data: process, error: pErr } = await supabase
      .from("clearance_processes")
      .select("*")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (pErr || !process) {
      return res.status(404).json({ error: "Clearance process not found" });
    }

    if (process.status !== "in_progress") {
      return res.status(400).json({ error: `Cannot update a process that is already ${process.status}` });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (current_step !== undefined) updates.current_step = current_step;
    if (reason_details !== undefined) {
      updates.reason_details = {
        ...(process.reason_details || {}),
        ...reason_details,
      };
    }

    // Category check updates
    if (library_cleared !== undefined) {
      updates.library_cleared = Boolean(library_cleared);
      updates.library_checked_at = new Date().toISOString();
    }
    if (library_notes !== undefined) updates.library_notes = library_notes;

    if (finance_cleared !== undefined) {
      updates.finance_cleared = Boolean(finance_cleared);
      updates.finance_checked_at = new Date().toISOString();
    }
    if (finance_notes !== undefined) updates.finance_notes = finance_notes;

    if (property_cleared !== undefined) {
      updates.property_cleared = Boolean(property_cleared);
      updates.property_checked_at = new Date().toISOString();
    }
    if (property_notes !== undefined) updates.property_notes = property_notes;

    // Admin override check
    const isAdmin = currentUser.role === "admin" || currentUser.role === "master_admin";
    if (admin_override !== undefined && isAdmin) {
      updates.admin_override = Boolean(admin_override);
      updates.override_reason = override_reason || null;
    }

    const { data: updated, error: uErr } = await supabase
      .from("clearance_processes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (uErr) throw uErr;

    res.json({
      message: "Clearance step updated successfully",
      process: updated,
    });
  } catch (err) {
    console.error("updateClearanceStep error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Step 5: Finalize Clearance Process
 * Transitions user account state, locks active participation, and generates audit record.
 */
exports.finalizeClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_override, override_reason } = req.body;
    const institution_id = req.institution_id;
    const currentUser = req.user;
    const isAdmin = currentUser.role === "admin" || currentUser.role === "master_admin";

    const { data: process, error: pErr } = await supabase
      .from("clearance_processes")
      .select("*, user:users!clearance_processes_user_id_fkey(id, full_name, role, email)")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (pErr || !process) {
      return res.status(404).json({ error: "Clearance process not found" });
    }

    if (process.status !== "in_progress") {
      return res.status(400).json({ error: `Process is already ${process.status}` });
    }

    // Expulsion rule: expulsion can ONLY be finalized by Admin
    if (process.reason_category === "expulsion" && !isAdmin) {
      return res.status(403).json({ error: "Expulsion clearance can only be finalized by an administrator" });
    }

    // Independent category validation
    const hasOverride = isAdmin && (admin_override || process.admin_override);
    const libraryOk = process.library_cleared;
    const financeOk = process.finance_cleared;
    const propertyOk = process.property_cleared;

    if (!hasOverride && (!libraryOk || !financeOk || !propertyOk)) {
      const pendingCategories = [];
      if (!libraryOk) pendingCategories.push("Library");
      if (!financeOk) pendingCategories.push("Finance");
      if (!propertyOk) pendingCategories.push("Property/Equipment");

      return res.status(400).json({
        error: `Cannot finalize clearance. Outstanding clearance issues in: ${pendingCategories.join(", ")}`,
        pending_categories: pendingCategories,
      });
    }

    const nowIso = new Date().toISOString();

    // 1. Mark clearance completed
    const { data: completedProcess, error: cErr } = await supabase
      .from("clearance_processes")
      .update({
        status: "completed",
        current_step: 5,
        completed_at: nowIso,
        completed_by: currentUser.id,
        admin_override: Boolean(hasOverride),
        override_reason: hasOverride ? (override_reason || process.override_reason || "Administrative override") : null,
        updated_at: nowIso,
      })
      .eq("id", id)
      .select()
      .single();

    if (cErr) throw cErr;

    // 2. Apply System-Wide Account State Effects (Part D5)
    const targetRole = process.user_role;
    const targetUserId = process.user_id;

    if (targetRole === "student") {
      // Convert student to read-and-download only:
      // Set enrollment_status to reason category (graduated/withdrawn/transferred/expelled)
      // Unassign from class so they no longer appear on active daily registers
      const enrollmentStatus = ["graduation", "graduated"].includes(process.reason_category)
        ? "graduated"
        : process.reason_category;

      await supabase
        .from("students")
        .update({
          enrollment_status: enrollmentStatus,
          class_id: null,
          updated_at: nowIso,
        })
        .eq("user_id", targetUserId);

      // If expulsion, also revoke login access
      if (process.reason_category === "expulsion") {
        await supabase
          .from("users")
          .update({
            is_active: false,
            status: "disabled",
            updated_at: nowIso,
          })
          .eq("id", targetUserId);
      }
    } else {
      // Staff (Teacher/Admin): account disabled, immediate session termination
      await supabase
        .from("users")
        .update({
          is_active: false,
          status: "disabled",
          updated_at: nowIso,
        })
        .eq("id", targetUserId);
    }

    res.json({
      message: "Clearance process completed and archived successfully",
      process: completedProcess,
    });
  } catch (err) {
    console.error("finalizeClearance error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Cancel Clearance Process
 */
exports.cancelClearance = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;
    const institution_id = req.institution_id;
    const currentUser = req.user;

    const { data: process, error: pErr } = await supabase
      .from("clearance_processes")
      .select("*")
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (pErr || !process) {
      return res.status(404).json({ error: "Clearance process not found" });
    }

    if (process.status !== "in_progress") {
      return res.status(400).json({ error: `Cannot cancel a process that is already ${process.status}` });
    }

    const { data: cancelled, error: cErr } = await supabase
      .from("clearance_processes")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: currentUser.id,
        cancellation_reason: cancellation_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (cErr) throw cErr;

    res.json({
      message: "Clearance process cancelled",
      process: cancelled,
    });
  } catch (err) {
    console.error("cancelClearance error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Admin Clearance Tracking Dashboard
 */
exports.listClearances = async (req, res) => {
  try {
    const institution_id = req.institution_id;
    const { status, reason_category, user_role, search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from("clearance_processes")
      .select(`
        *,
        user:users!clearance_processes_user_id_fkey(id, full_name, email, role, avatar_url),
        initiator:users!clearance_processes_initiator_user_id_fkey(id, full_name, email, role),
        completer:users!clearance_processes_completed_by_fkey(id, full_name, email)
      `, { count: "exact" })
      .eq("institution_id", institution_id)
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (reason_category) query = query.eq("reason_category", reason_category);
    if (user_role) query = query.eq("user_role", user_role);

    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    let filtered = data || [];
    if (search && search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.user?.full_name?.toLowerCase().includes(q) ||
        p.user?.email?.toLowerCase().includes(q) ||
        p.reason_category?.toLowerCase().includes(q)
      );
    }

    res.json({
      clearances: filtered,
      total: count || 0,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (err) {
    console.error("listClearances error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get Clearance Details & Step History
 */
exports.getClearanceDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.institution_id;

    const { data: process, error } = await supabase
      .from("clearance_processes")
      .select(`
        *,
        user:users!clearance_processes_user_id_fkey(id, full_name, email, role, avatar_url),
        initiator:users!clearance_processes_initiator_user_id_fkey(id, full_name, email, role),
        completer:users!clearance_processes_completed_by_fkey(id, full_name, email)
      `)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (error || !process) {
      return res.status(404).json({ error: "Clearance process not found" });
    }

    res.json({ process });
  } catch (err) {
    console.error("getClearanceDetails error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Downloadable Clearance Confirmation PDF (Part D7)
 */
exports.downloadClearancePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const institution_id = req.institution_id;

    const { data: process, error: pErr } = await supabase
      .from("clearance_processes")
      .select(`
        *,
        user:users!clearance_processes_user_id_fkey(id, full_name, email, role),
        completer:users!clearance_processes_completed_by_fkey(full_name)
      `)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .single();

    if (pErr || !process) {
      return res.status(404).json({ error: "Clearance process not found" });
    }

    const { data: institution } = await supabase
      .from("institutions")
      .select("name, logo_url")
      .eq("id", institution_id)
      .single();

    const pdfBuffer = await compilePdfBuffer({
      document_type: "clearance_confirmation",
      data: {
        institution_name: institution?.name || "SuiteIvy Institution",
        institution_logo: institution?.logo_url || null,
        process: {
          id: process.id,
          reference_no: `CLR-${process.id.slice(0, 8).toUpperCase()}`,
          reason_category: process.reason_category,
          status: process.status,
          created_at: process.created_at,
          completed_at: process.completed_at || process.updated_at,
          admin_override: process.admin_override,
          override_reason: process.override_reason,
          library_cleared: process.library_cleared,
          finance_cleared: process.finance_cleared,
          property_cleared: process.property_cleared,
        },
        user: {
          id: process.user?.id,
          full_name: process.user?.full_name,
          email: process.user?.email,
          role: process.user_role,
        },
        authorized_by: process.completer?.full_name || "Institution Administrator",
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="Clearance-Certificate-${process.user?.full_name?.replace(/[^a-zA-Z0-9]/g, "_") || "User"}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (err) {
    console.error("downloadClearancePdf error:", err);
    res.status(500).json({ error: "Failed to generate clearance confirmation PDF" });
  }
};
