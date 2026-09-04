// controllers/library.controller.js
const supabase = require("../utils/supabaseClient.js");
let clearUserCache;
try {
  ({ clearUserCache } = require("../middleware/auth.middleware.js"));
} catch {
  clearUserCache = () => {};
}

/** Pull active config, fall back to sane defaults */
async function getActiveConfig(institution_id) {
  let query = supabase
    .from("library_config")
    .select("min_fee_percent_for_borrow, default_borrow_limit")
    .eq("active", true)
    .limit(1);

  if (institution_id) {
    query = query.eq('institution_id', institution_id);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return {
      min_fee_percent_for_borrow: 0.5, // 50%
      default_borrow_limit: 3,
    };
  }
  return data;
}

let booksArchivedAtSupportPromise = null;
async function supportsBooksArchivedAt() {
  if (!booksArchivedAtSupportPromise) {
    booksArchivedAtSupportPromise = (async () => {
      let probe;
      try {
        probe = supabase.from('books');
      } catch {
        return true;
      }

      if (!probe || typeof probe.select !== 'function') {
        return true;
      }

      const { error } = await probe.select('archived_at').limit(1);
      if (!error) return true;

      const message = String(error?.message || '').toLowerCase();
      const details = String(error?.details || '').toLowerCase();
      const code = String(error?.code || '').toLowerCase();
      if (message.includes('archived_at') || details.includes('archived_at') || code === '42703') {
        return false;
      }
      throw error;
    })().catch((error) => {
      booksArchivedAtSupportPromise = null;
      throw error;
    });
  }

  return booksArchivedAtSupportPromise;
}

/** Compute student's overall fee % */
async function getStudentOverallFeePercent(userId, institution_id) {
  // 1. Get enrolled subjects to calculate total fee due
  const { data: student } = await supabase
    .from('students')
    .select('id, user_id')
    .eq('user_id', userId)
    .eq('institution_id', institution_id)
    .single();
  if (!student) return 0; // Not a student

  const { data: enrollments, error: enrErr } = await supabase
    .from('enrollments')
    .select('subject_id, subjects(fee_amount)')
    .eq('student_id', student.id)
    .eq('institution_id', institution_id);

  if (enrErr) {
    console.error("Fee check enrollment error", enrErr);
    return 0;
  }

  let totalFee = 0;
  if (enrollments) {
    enrollments.forEach(enr => {
      totalFee += (enr.subjects?.fee_amount || 0);
    });
  }

  if (totalFee <= 0) return 1.0; // No fees = 100% paid

  // 2. Get total paid from financial_transactions
  const { data: transactions, error: txErr } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('user_id', userId)
    .eq('institution_id', institution_id)
    .eq('type', 'fee_payment')
    .eq('direction', 'inflow');

  if (txErr) {
    console.error("Fee check transaction error", txErr);
    return 0;
  }

  const totalPaid = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return totalPaid / totalFee;
}

/** Helper to get STUDENT ID (TEXT) from USER ID (UUID) */
async function getStudentId(userId, institution_id = null) {
  let query = supabase
    .from('students')
    .select('id')
    .eq('user_id', userId);

  if (institution_id) query = query.eq('institution_id', institution_id);

  const { data, error } = await query.single();

  if (error || !data) return null;
  return data.id;
}

/** Helper to get TEACHER ID (TEXT) from USER ID (UUID) */
async function getTeacherId(userId, institution_id = null) {
  let query = supabase
    .from('teachers')
    .select('id')
    .eq('user_id', userId);

  if (institution_id) query = query.eq('institution_id', institution_id);

  const { data, error } = await query.single();

  if (error || !data) return null;
  return data.id;
}

/** Check if borrower has any overdue, unreturned books */
async function hasOverdueBooks({ studentId, teacherId, institution_id }) {
  const query = supabase
    .from("borrowed_books")
    .select("id")
    .is("returned_at", null)
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .neq("status", "returned");

  if (studentId) query.eq("student_id", studentId);
  if (teacherId) query.eq("teacher_id", teacherId);
  if (institution_id) query.eq('institution_id', institution_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).length > 0;
}

/** Count actively borrowed (not yet returned) */
async function activeBorrowCount({ studentId, teacherId, institution_id }) {
  const query = supabase
    .from("borrowed_books")
    .select("id", { count: "exact", head: true })
    .is("returned_at", null)
    .eq("status", "borrowed");

  if (studentId) query.eq("student_id", studentId);
  if (teacherId) query.eq("teacher_id", teacherId);
  if (institution_id) query.eq('institution_id', institution_id);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** Admin only: add or update a book (Item) */
exports.addOrUpdateBook = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      title,
      author,
      isbn,
      category,
      total_quantity,
      // cover_url, // Not in schema 'books'
      // location   // Not in schema 'books'
    } = req.body;
    const id = req.body.id || req.params.bookId;
    const institution_id = req.institution_id;

    if (!title || total_quantity == null) {
      return res.status(400).json({ error: "title and total_quantity are required" });
    }

    if (total_quantity < 0) {
      return res.status(400).json({ error: "total_quantity cannot be negative" });
    }

    if (!id) {
      // Insert
      const { data, error } = await supabase
        .from("books") // Changed from library_items
        .insert([
          {
            title,
            author,
            isbn,
            category,
            total_quantity,
            available_quantity: total_quantity,
            institution_id,
          },
        ])
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ message: "Book added", book: data });
    } else {
      // Update
      const { data: existing, error: fetchErr } = await supabase
        .from("books") // Changed from library_items
        .select("*")
        .eq("id", id)
        .eq("institution_id", institution_id)
        .single();

      if (fetchErr || !existing) return res.status(404).json({ error: "Book not found" });

      const newTotal = total_quantity !== undefined ? Number(total_quantity) : existing.total_quantity;
      const oldTotal = Number(existing.total_quantity);
      let newAvailable = Number(existing.available_quantity);

      if (total_quantity !== undefined && newTotal !== oldTotal) {
        const diff = newTotal - oldTotal;
        newAvailable += diff;
        if (newAvailable < 0) newAvailable = 0;
      }

      const update = {
        title: title ?? existing.title,
        author: author ?? existing.author,
        isbn: isbn ?? existing.isbn,
        category: category ?? existing.category,
        total_quantity: newTotal,
        available_quantity: newAvailable,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("books") // Changed from library_items
        .update(update)
        .eq("id", id)
        .eq("institution_id", institution_id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ message: "Book updated", book: data });
    }
  } catch (e) {
    console.error("addOrUpdateBook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/** List books (Items) */
exports.listBooks = async (req, res) => {
  try {
    const { institution_id } = req;
    const includeUnavailable = (req.query.includeUnavailable || "").toString().toLowerCase() === "true";
    const hasArchivedAt = await supportsBooksArchivedAt();

    let query = supabase
      .from("books") // Changed from library_items
      .select("*")
      .eq("institution_id", institution_id)
      .order("created_at", { ascending: false });

    if (hasArchivedAt) {
      query = query.is('archived_at', null);
    }

    if (!includeUnavailable) {
      query = query.gt("available_quantity", 0);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e) {
    console.error("listBooks error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

function isLibrarianOrMainAdmin(req) {
  if (!req) return false;
  if (req.userRole === 'master_admin' || req.isPlatformAdmin) return true;
  if (req.userRole === 'admin' && (req.isMain || req.isMain === undefined)) return true;
  if (req.isLibrarian || req.user?.is_librarian) return true;
  return false;
}

/** Issue a book to a student or teacher (Librarian/Main Admin only) */
exports.issueBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    let { bookId, studentId, teacherId, borrowerId, borrowerType, notes, days = 14, dueDate } = req.body || {};

    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    // Resolve borrower ID & type
    if (!studentId && !teacherId && borrowerId) {
      if (borrowerType === 'teacher') {
        teacherId = borrowerId;
      } else {
        studentId = borrowerId;
      }
    }

    if (!bookId || (!studentId && !teacherId)) {
      return res.status(400).json({ error: "Book ID and borrower (Student ID or Teacher ID) are required" });
    }

    // Disallow self-checkout for librarians (must be peer-checked out)
    if (studentId) {
      const { data: stUser } = await supabase
        .from('students')
        .select('user_id')
        .eq('id', studentId)
        .eq('institution_id', institution_id)
        .maybeSingle();
      if (stUser?.user_id && stUser.user_id === req.userId) {
        return res.status(400).json({ error: "Librarians cannot check out books to themselves. Please have another librarian process your borrowing." });
      }
    } else if (teacherId) {
      const { data: tcUser } = await supabase
        .from('teachers')
        .select('user_id')
        .eq('id', teacherId)
        .eq('institution_id', institution_id)
        .maybeSingle();
      if (tcUser?.user_id && tcUser.user_id === req.userId) {
        return res.status(400).json({ error: "Librarians cannot check out books to themselves. Please have another librarian process your borrowing." });
      }
    }

    const hasArchivedAt = await supportsBooksArchivedAt();

    let itemQuery = supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("institution_id", institution_id);

    if (hasArchivedAt) itemQuery = itemQuery.is('archived_at', null);

    const { data: item, error: itemErr } = await itemQuery.single();

    if (itemErr || !item) return res.status(404).json({ error: "Book not found." });
    if (item.available_quantity <= 0) return res.status(400).json({ error: "Book out of stock" });

    // Validate borrower exists in this institution
    if (studentId) {
      const { data: student, error: studentErr } = await supabase
        .from("students")
        .select("id, user_id")
        .eq("id", studentId)
        .eq("institution_id", institution_id)
        .single();

      if (studentErr || !student) return res.status(404).json({ error: "Student not found in this institution." });

      // Check fee threshold for students
      const cfg = await getActiveConfig(institution_id);
      const overallPct = await getStudentOverallFeePercent(student.user_id, institution_id);
      if (overallPct < Number(cfg.min_fee_percent_for_borrow)) {
        return res.status(403).json({
          error: `Insufficient fee payment. Need at least ${Number(cfg.min_fee_percent_for_borrow) * 100}% overall.`,
          details: { percent: Math.round(overallPct * 100) },
        });
      }
    } else if (teacherId) {
      const { data: teacher, error: teacherErr } = await supabase
        .from("teachers")
        .select("id, user_id")
        .eq("id", teacherId)
        .eq("institution_id", institution_id)
        .single();

      if (teacherErr || !teacher) return res.status(404).json({ error: "Teacher not found in this institution." });
    }

    // Check overdue books
    if (await hasOverdueBooks({ studentId, teacherId, institution_id })) {
      return res.status(403).json({ error: "Borrower has overdue books. Return them first." });
    }

    // Check borrow count limit
    const cfg = await getActiveConfig(institution_id);
    const activeCount = await activeBorrowCount({ studentId, teacherId, institution_id });
    if (activeCount >= Number(cfg.default_borrow_limit)) {
      return res.status(403).json({ error: `Borrow limit reached (${cfg.default_borrow_limit}).` });
    }

    let formattedDueDate;
    if (dueDate) {
      const parsed = new Date(dueDate);
      if (!Number.isNaN(parsed.getTime())) {
        formattedDueDate = parsed.toISOString().slice(0, 10);
      }
    }
    if (!formattedDueDate) {
      const calcDueDate = new Date();
      calcDueDate.setDate(calcDueDate.getDate() + Number(days));
      formattedDueDate = calcDueDate.toISOString().slice(0, 10);
    }

    const { data: loan, error: loanErr } = await supabase
      .from("borrowed_books")
      .insert([
        {
          book_id: bookId,
          student_id: studentId || null,
          teacher_id: teacherId || null,
          status: 'borrowed',
          borrowed_at: new Date().toISOString(),
          due_date: formattedDueDate,
          institution_id,
          issued_by: req.userId || null,
          notes: notes || ""
        },
      ])
      .select()
      .single();

    if (loanErr) return res.status(500).json({ error: loanErr.message });
    
    return res.status(201).json({ message: "Book issued successfully", borrow: loan });
  } catch (e) {
    console.error("issueBook error:", e);
    return res.status(500).json({ error: "Server error: " + e.message });
  }
};


/** Self-service borrow is explicitly blocked per Section 2 & 6 */
exports.borrowBook = async (_req, res) => {
  return res.status(403).json({
    error: "Self-service borrowing is disabled. All book checkouts must be processed in-person by an authorized school librarian.",
    code: "SELF_SERVICE_DISABLED"
  });
};

/** Return a borrowed book (Librarian/Main Admin only) */
exports.returnBook = async (req, res) => {
  try {
    const { institution_id } = req;
    const { borrowId } = req.params;
    const { notes, condition } = req.body || {};

    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    if (!institution_id) {
      return res.status(400).json({ error: "Institution context is required" });
    }

    if (!borrowId) return res.status(400).json({ error: "borrowId is required" });

    const { data: loan, error: loanErr } = await supabase
      .from("borrowed_books")
      .select("*, books(available_quantity)")
      .eq("id", borrowId)
      .eq("institution_id", institution_id)
      .is("returned_at", null)
      .limit(1)
      .maybeSingle();

    if (loanErr || !loan) return res.status(404).json({ error: "Active loan not found" });

    const returnNotes = notes || condition || "";

    let updateQuery = supabase
      .from("borrowed_books")
      .update({
        returned_at: new Date().toISOString(),
        returned_by: req.userId || null,
        return_notes: returnNotes,
        status: "returned",
        updated_at: new Date().toISOString()
      })
      .eq("id", loan.id)
      .eq("institution_id", institution_id);

    let updatedLoan = null;
    let updErr = null;
    if (typeof updateQuery.select === 'function') {
      const selectRes = await updateQuery.select().single();
      updatedLoan = selectRes.data;
      updErr = selectRes.error;
    } else {
      const execRes = await updateQuery;
      updErr = execRes?.error;
    }

    if (updErr) return res.status(500).json({ error: updErr.message });

    // Increment stock on return
    const { data: item } = await supabase
      .from('books')
      .select('available_quantity')
      .eq('id', loan.book_id)
      .eq('institution_id', institution_id)
      .single();
    if (item) {
      await supabase
        .from('books')
        .update({ available_quantity: item.available_quantity + 1, updated_at: new Date().toISOString() })
        .eq('id', loan.book_id)
        .eq('institution_id', institution_id);
    }

    return res.json({ message: "Returned", borrow: updatedLoan });
  } catch (e) {
    console.error("returnBook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/** Borrowing history */
exports.history = async (req, res) => {
  try {
    const { studentId } = req.params; // If admin viewing specific student
    let targetStudentId = studentId;

    if (targetStudentId) {
      if (!isLibrarianOrMainAdmin(req)) {
        return res.status(403).json({ error: "Access denied. Insufficient permissions." });
      }
    } else {
      // If student or teacher viewing own history
      const sId = await getStudentId(req.userId, req.institution_id);
      const tId = await getTeacherId(req.userId, req.institution_id);
      
      if (sId) {
        targetStudentId = sId;
      } else if (tId) {
        // Teachers see their own history
        const { data, error } = await supabase
          .from("borrowed_books")
          .select("*, books(title, author, isbn), issuer:issued_by(full_name), returner:returned_by(full_name)")
          .eq("teacher_id", tId)
          .eq('institution_id', req.institution_id)
          .order("created_at", { ascending: false });
        if (error) return res.status(500).json({ error: error.message });
        return res.json(data);
      } else {
        return res.status(400).json({ error: "Profile not found" });
      }
    }

    const { data, error } = await supabase
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e) {
    console.error("history error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/** Update Status (Librarian/Main Admin only) */
exports.updateBorrowStatus = async (req, res) => {
  try {
    const { borrowId } = req.params;
    const { status } = req.body;

    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    const { data: loan, error: fetchErr } = await supabase
      .from("borrowed_books")
      .select("*, books(available_quantity)")
      .eq("id", borrowId)
      .eq("institution_id", req.institution_id)
      .single();
    if (fetchErr || !loan) return res.status(404).json({ error: "Loan not found" });

    const updates = { status, updated_at: new Date().toISOString() };

    // If transitioning to borrowed, set date and handle stock if not already handled
    if (status === 'borrowed' && loan.status !== 'borrowed') {
      const days = 14;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      updates.due_date = dueDate.toISOString().slice(0, 10);
      updates.borrowed_at = new Date().toISOString();

      if (loan.books?.available_quantity > 0) {
        await supabase.from('books')
          .update({ available_quantity: loan.books.available_quantity - 1 })
          .eq('id', loan.book_id)
          .eq('institution_id', req.institution_id);
      }
    } else if (status === 'returned' && loan.status !== 'returned') {
      updates.returned_at = new Date().toISOString();
      updates.returned_by = req.userId || null;
      const { data: item } = await supabase
        .from('books')
        .select('available_quantity')
        .eq('id', loan.book_id)
        .eq('institution_id', req.institution_id)
        .single();
      if (item) {
        await supabase
          .from('books')
          .update({ available_quantity: item.available_quantity + 1 })
          .eq('id', loan.book_id)
          .eq('institution_id', req.institution_id);
      }
    }

    const { data, error } = await supabase
      .from("borrowed_books")
      .update(updates)
      .eq("id", borrowId)
      .eq('institution_id', req.institution_id)
      .select()
      .single();
    if (error) throw error;

    res.json({ message: "Status updated", borrow: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/** Delete a book (Admin only) */
exports.deleteBook = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Admin only." });
    }

    const { bookId } = req.params;
    const institution_id = req.institution_id;

    if (!bookId) return res.status(400).json({ error: "bookId is required" });

    const hasArchivedAt = await supportsBooksArchivedAt();

    let deleteQuery = supabase
      .from('books')
      .update(
        hasArchivedAt
          ? { archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          : { updated_at: new Date().toISOString(), available_quantity: 0 }
      )
      .eq('id', bookId)
      .eq('institution_id', institution_id);

    if (hasArchivedAt) {
      deleteQuery = deleteQuery.is('archived_at', null);
    }

    const { error } = await deleteQuery;

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Book archived" });
  } catch (e) {
    console.error("deleteBook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.rejectBorrowRequest = async (req, res) => {
  try {
    const { borrowId } = req.params;

    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    const { data: loan, error: fetchErr } = await supabase
      .from("borrowed_books")
      .select("id, status, returned_at, institution_id")
      .eq("id", borrowId)
      .eq("institution_id", req.institution_id)
      .single();

    if (fetchErr || !loan) return res.status(404).json({ error: "Loan not found" });
    if (loan.status === "returned" || loan.returned_at) {
      return res.status(409).json({ error: "Cannot reject a returned loan" });
    }

    const { data, error } = await supabase
      .from("borrowed_books")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .eq("id", borrowId)
      .eq("institution_id", req.institution_id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ message: "Borrow request rejected", borrow: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.sendReminder = async (req, res) => {
  try {
    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    const { borrowId } = req.params;
    const { data: loan, error } = await supabase
      .from("borrowed_books")
      .select(`
        id,
        institution_id,
        student_id,
        teacher_id,
        books(title),
        students(users(id, full_name)),
        teachers(users(id, full_name))
      `)
      .eq("id", borrowId)
      .eq("institution_id", req.institution_id)
      .single();

    if (error || !loan) return res.status(404).json({ error: "Loan not found" });

    const targetUserId = loan?.students?.users?.id || loan?.teachers?.users?.id;
    const borrowerName = loan?.students?.users?.full_name || loan?.teachers?.users?.full_name || "Borrower";
    const bookTitle = loan?.books?.title || "book";

    if (!targetUserId) {
      return res.status(400).json({ error: "Unable to resolve reminder recipient" });
    }

    const { error: insertErr } = await supabase
      .from("notifications")
      .insert([
        {
          user_id: targetUserId,
          title: "Library Reminder",
          message: `${borrowerName}, please return or renew "${bookTitle}" if still active.`,
          type: "warning",
          institution_id: req.institution_id,
          data: {
            module: "library",
            borrow_id: borrowId,
          },
        },
      ]);

    if (insertErr) throw insertErr;
    return res.json({ message: "Reminder sent" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

exports.extendDueDate = async (req, res) => {
  try {
    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    const { borrowId } = req.params;
    const { new_due_date } = req.body || {};

    if (!new_due_date) {
      return res.status(400).json({ error: "new_due_date is required" });
    }

    const parsed = new Date(new_due_date);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: "Invalid new_due_date" });
    }

    const normalizedDate = parsed.toISOString().slice(0, 10);
    const { data: loan, error: fetchErr } = await supabase
      .from("borrowed_books")
      .select("id, status, returned_at, institution_id")
      .eq("id", borrowId)
      .eq("institution_id", req.institution_id)
      .single();

    if (fetchErr || !loan) return res.status(404).json({ error: "Loan not found" });
    if (loan.status === "returned" || loan.returned_at) {
      return res.status(409).json({ error: "Cannot extend a returned loan" });
    }

    const { data, error } = await supabase
      .from("borrowed_books")
      .update({ due_date: normalizedDate, updated_at: new Date().toISOString() })
      .eq("id", borrowId)
      .eq("institution_id", req.institution_id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ message: "Extended", borrow: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

/**
 * Shared institution-wide circulation records with filtering
 * Supported filters per Section 5:
 * - overdueOnly: boolean
 * - currentlyBorrowed: boolean
 * - borrowerId: studentId or teacherId
 * - bookId: book id
 * - librarianId: issued_by or returned_by
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - search: search query on book title, borrower name, or ISBN
 */
exports.getAllBorrowedBooks = async (req, res) => {
  try {
    const { institution_id } = req;
    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied: Librarian designation required." });
    }

    const {
      overdueOnly,
      currentlyBorrowed,
      borrowerId,
      bookId,
      librarianId,
      startDate,
      endDate,
      search,
    } = req.query || {};

    let query = supabase
      .from("borrowed_books")
      .select(`
        *,
        books(id, title, author, isbn, category),
        students(id, user_id, users:user_id(id, full_name, email)),
        teachers(id, user_id, users:user_id(id, full_name, email)),
        issuer:issued_by(id, full_name),
        returner:returned_by(id, full_name)
      `)
      .eq("institution_id", institution_id)
      .order("created_at", { ascending: false });

    if (String(overdueOnly).toLowerCase() === 'true') {
      const today = new Date().toISOString().slice(0, 10);
      query = query.is("returned_at", null).lt("due_date", today);
    } else if (String(currentlyBorrowed).toLowerCase() === 'true') {
      query = query.is("returned_at", null);
    }

    if (bookId) {
      query = query.eq("book_id", bookId);
    }

    if (borrowerId) {
      query = query.or(`student_id.eq.${borrowerId},teacher_id.eq.${borrowerId}`);
    }

    if (librarianId) {
      query = query.or(`issued_by.eq.${librarianId},returned_by.eq.${librarianId}`);
    }

    if (startDate) {
      query = query.gte("borrowed_at", startDate);
    }

    if (endDate) {
      query = query.lte("borrowed_at", endDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error("getAllBorrowedBooks query error:", error);
      return res.status(500).json({ error: error.message });
    }

    let records = data || [];

    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      records = records.filter(item => {
        const title = item.books?.title?.toLowerCase() || '';
        const isbn = item.books?.isbn?.toLowerCase() || '';
        const author = item.books?.author?.toLowerCase() || '';
        const studentName = item.students?.users?.full_name?.toLowerCase() || '';
        const teacherName = item.teachers?.users?.full_name?.toLowerCase() || '';
        const issuerName = item.issuer?.full_name?.toLowerCase() || '';
        return (
          title.includes(s) ||
          isbn.includes(s) ||
          author.includes(s) ||
          studentName.includes(s) ||
          teacherName.includes(s) ||
          issuerName.includes(s)
        );
      });
    }

    return res.json(records);
  } catch (e) {
    console.error("getAllBorrowedBooks error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * List all eligible staff (teachers, admins) in the institution with their librarian designation status.
 * Main Admin / Master Admin only.
 */
exports.getLibrariansList = async (req, res) => {
  try {
    const { institution_id } = req;
    const isMainAdmin = (req.userRole === 'admin' && (req.isMain || req.user?.is_main)) || req.userRole === 'master_admin';

    if (!isMainAdmin) {
      return res.status(403).json({ error: "Access denied: Main Admin privileges required." });
    }

    const { data: staffUsers, error: staffErr } = await supabase
      .from('users')
      .select('id, full_name, email, role, is_main, phone')
      .eq('institution_id', institution_id)
      .in('role', ['teacher', 'admin'])
      .order('full_name', { ascending: true });

    if (staffErr) {
      return res.status(500).json({ error: staffErr.message });
    }

    const { data: designations, error: desErr } = await supabase
      .from('librarian_designations')
      .select('id, user_id, designated_by, designated_at, designated_by_user:designated_by(full_name)')
      .eq('institution_id', institution_id);

    if (desErr) {
      return res.status(500).json({ error: desErr.message });
    }

    const designationMap = new Map((designations || []).map(d => [d.user_id, d]));

    const result = (staffUsers || []).map(user => {
      const des = designationMap.get(user.id);
      return {
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        is_main: !!user.is_main,
        phone: user.phone || null,
        is_librarian: !!des,
        designated_at: des?.designated_at || null,
        designated_by: des?.designated_by || null,
        designated_by_name: des?.designated_by_user?.full_name || null
      };
    });

    return res.json(result);
  } catch (e) {
    console.error("getLibrariansList error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Grant or revoke Librarian designation for a staff member.
 * Main Admin / Master Admin only.
 */
exports.toggleLibrarianDesignation = async (req, res) => {
  try {
    const { institution_id } = req;
    const isMainAdmin = (req.userRole === 'admin' && (req.isMain || req.user?.is_main)) || req.userRole === 'master_admin';

    if (!isMainAdmin) {
      return res.status(403).json({ error: "Access denied: Only the Main Admin can assign or revoke Librarian designations." });
    }

    const { userId, action, reason } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { data: targetUser, error: userErr } = await supabase
      .from('users')
      .select('id, full_name, email, role, institution_id')
      .eq('id', userId)
      .eq('institution_id', institution_id)
      .single();

    if (userErr || !targetUser) {
      return res.status(404).json({ error: "User not found in this institution" });
    }

    if (!['teacher', 'admin'].includes(targetUser.role)) {
      return res.status(400).json({ error: "Only Teachers and Admins can be designated as Librarians." });
    }

    const { data: existingDes } = await supabase
      .from('librarian_designations')
      .select('id')
      .eq('institution_id', institution_id)
      .eq('user_id', userId)
      .maybeSingle();

    const shouldGrant = action === 'grant' ? true : action === 'revoke' ? false : !existingDes;

    if (shouldGrant) {
      if (!existingDes) {
        const { error: insErr } = await supabase
          .from('librarian_designations')
          .insert([{
            institution_id,
            user_id: userId,
            designated_by: req.userId,
            designated_at: new Date().toISOString()
          }]);
        if (insErr) throw insErr;
      }

      await supabase.from('librarian_audit_logs').insert([{
        institution_id,
        target_user_id: userId,
        performed_by: req.userId,
        action: 'grant',
        notes: reason || `Librarian designation granted by ${req.user?.full_name || 'Admin'}`
      }]);

      clearUserCache(userId);

      return res.json({
        message: `Librarian designation granted to ${targetUser.full_name}`,
        is_librarian: true,
        user_id: userId
      });
    } else {
      if (existingDes) {
        const { error: delErr } = await supabase
          .from('librarian_designations')
          .delete()
          .eq('institution_id', institution_id)
          .eq('user_id', userId);
        if (delErr) throw delErr;
      }

      await supabase.from('librarian_audit_logs').insert([{
        institution_id,
        target_user_id: userId,
        performed_by: req.userId,
        action: 'revoke',
        notes: reason || `Librarian designation revoked by ${req.user?.full_name || 'Admin'}`
      }]);

      clearUserCache(userId);

      return res.json({
        message: `Librarian designation revoked for ${targetUser.full_name}`,
        is_librarian: false,
        user_id: userId
      });
    }
  } catch (e) {
    console.error("toggleLibrarianDesignation error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
};

/**
 * View librarian designation audit trail.
 * Main Admin or Librarian.
 */
exports.getLibrarianAuditLogs = async (req, res) => {
  try {
    const { institution_id } = req;
    if (!isLibrarianOrMainAdmin(req)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data: logs, error } = await supabase
      .from('librarian_audit_logs')
      .select(`
        id,
        action,
        notes,
        created_at,
        target:target_user_id(id, full_name, email, role),
        performer:performed_by(id, full_name, email)
      `)
      .eq('institution_id', institution_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(logs || []);
  } catch (e) {
    console.error("getLibrarianAuditLogs error:", e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
};

/**
 * Check current user's librarian and admin designation status.
 */
exports.getMyDesignation = async (req, res) => {
  try {
    const isLibrarian = !!(req.isLibrarian || req.user?.is_librarian);
    const isMainAdmin = (req.userRole === 'admin' && (req.isMain || req.user?.is_main)) || req.userRole === 'master_admin';

    return res.json({
      isLibrarian,
      isMainAdmin: !!isMainAdmin,
      role: req.userRole,
      userId: req.userId
    });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};
