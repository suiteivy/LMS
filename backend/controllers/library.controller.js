// controllers/library.controller.js
const supabase = require("../utils/supabaseClient.js");

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

/** Issue a book to a student (Teacher/Admin only) */
exports.issueBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const { bookId, studentId, notes, days = 14 } = req.body;

    if (!["teacher", "admin"].includes(userRole)) {
      return res.status(403).json({ error: "Teachers or Admins only." });
    }

    if (!bookId || !studentId) {
      return res.status(400).json({ error: "Book ID and Student ID are required" });
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

    const { data: student, error: studentErr } = await supabase
      .from("students")
      .select("id")
      .eq("id", studentId)
      .eq("institution_id", institution_id)
      .single();

    if (studentErr || !student) return res.status(404).json({ error: "Student not found in this institution." });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    const { data: loan, error: loanErr } = await supabase
      .from("borrowed_books")
      .insert([
        {
          book_id: bookId,
          student_id: studentId,
          teacher_id: userRole === "teacher" ? await getTeacherId(req.userId, institution_id) : null,
          status: 'borrowed',
          borrowed_at: new Date().toISOString(),
          due_date: dueDate.toISOString().slice(0, 10),
          institution_id,
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


/** Borrow a book (student) */
exports.borrowBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const { bookId, days = 14 } = req.body; // bookId matches existing param
    const appUserId = req.userId; // This is the user.id (UUID)

    if (!["student", "teacher"].includes(userRole)) {
      return res.status(403).json({ error: "Students or Teachers only." });
    }

    let studentId = null;
    let teacherId = null;

    if (userRole === "student") {
      studentId = await getStudentId(appUserId, institution_id);
      if (!studentId) return res.status(400).json({ error: "Student profile not found" });
    } else {
      teacherId = await getTeacherId(appUserId, institution_id);
      if (!teacherId) return res.status(400).json({ error: "Teacher profile not found" });
    }

    const hasArchivedAt = await supportsBooksArchivedAt();

    // 1) Book must exist
    let itemQuery = supabase
      .from("books") // Changed from library_items
      .select("*")
      .eq("id", bookId)
      .eq("institution_id", institution_id);

    if (hasArchivedAt) itemQuery = itemQuery.is('archived_at', null);

    const { data: item, error: itemErr } = await itemQuery.single();

    if (itemErr || !item) return res.status(404).json({ error: "Book not found." });
    if (item.available_quantity <= 0) return res.status(400).json({ error: "Book out of stock" });

    // 2) Fee threshold (Students only)
    if (userRole === "student") {
      const cfg = await getActiveConfig(institution_id);
      const overallPct = await getStudentOverallFeePercent(appUserId, institution_id);
      if (overallPct < Number(cfg.min_fee_percent_for_borrow)) {
        return res.status(403).json({
          error: `Insufficient fee payment. Need at least ${Number(cfg.min_fee_percent_for_borrow) * 100}% overall.`,
          details: { percent: Math.round(overallPct * 100) },
        });
      }
    }

    // 3) No overdue books
    if (await hasOverdueBooks({ studentId, teacherId, institution_id })) {
      return res.status(403).json({ error: "You have overdue books. Return them first." });
    }

    // 4) Borrow count < limit
    const cfg = await getActiveConfig(institution_id);
    const activeCount = await activeBorrowCount({ studentId, teacherId, institution_id });
    if (activeCount >= Number(cfg.default_borrow_limit)) {
      return res.status(403).json({ error: `Borrow limit reached (${cfg.default_borrow_limit}).` });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    const { data: loan, error: loanErr } = await supabase
      .from("borrowed_books") // Changed from library_loans
      .insert([
        {
          book_id: bookId, // Changed from item_id
          student_id: studentId,
          teacher_id: teacherId,
          status: 'borrowed',
          borrowed_at: new Date().toISOString(), // Changed from borrow_date
          due_date: dueDate.toISOString().slice(0, 10),
          institution_id
        },
      ])
      .select()
      .single();

    if (loanErr) return res.status(500).json({ error: loanErr.message });

    return res.status(201).json({ message: "Borrowed successfully", borrow: loan, due_date: dueDate });
  } catch (e) {
    console.error("borrowBook error:", e);
    return res.status(500).json({ error: "Server error: " + e.message });
  }
};

/** Return a borrowed book */
exports.returnBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const appUserId = req.userId;
    const { borrowId } = req.params;

    if (!institution_id) {
      return res.status(400).json({ error: "Institution context is required" });
    }

    if (!borrowId) return res.status(400).json({ error: "borrowId is required" });

    let query = supabase
      .from("borrowed_books") // Changed from library_loans
      .select("*")
      .eq("id", borrowId)
      .eq("institution_id", institution_id)
      .is("returned_at", null); // Changed from return_date

    // If student or teacher, ensure it owns the loan
    if (!["admin", "master_admin"].includes(userRole)) {
      const studentId = await getStudentId(appUserId, institution_id);
      const teacherId = await getTeacherId(appUserId, institution_id);
      
      if (studentId) query = query.eq("student_id", studentId);
      else if (teacherId) query = query.eq("teacher_id", teacherId);
      else return res.status(403).json({ error: "Profile required" });
    }

    const { data: loan, error: loanErr } = await query.limit(1).maybeSingle();

    if (loanErr || !loan) return res.status(404).json({ error: "Active loan not found" });

    const { error: updErr } = await supabase
      .from("borrowed_books") // Changed from library_loans
      .update({ returned_at: new Date().toISOString(), status: "returned" })
      .eq("id", loan.id)
      .eq("institution_id", institution_id);

    if (updErr) return res.status(500).json({ error: updErr.message });

    // Increment stock on return (borrow insert decrement is handled by DB trigger)
    const { data: item } = await supabase
      .from('books')
      .select('available_quantity')
      .eq('id', loan.book_id)
      .eq('institution_id', institution_id)
      .single();
    if (item) {
      await supabase
        .from('books')
        .update({ available_quantity: item.available_quantity + 1 })
        .eq('id', loan.book_id)
        .eq('institution_id', institution_id);
    }

    return res.json({ message: "Returned" });
  } catch (e) {
    console.error("returnBook error:", e);
    res.status(500).json({ error: "Server error" });
  }
};

/** Borrowing history */
exports.history = async (req, res) => {
  try {
    const { studentId } = req.params; // If admin viewing specific student
    let targetStudentId = studentId;

    if (targetStudentId) {
      if (req.userRole !== 'admin' && req.userRole !== 'teacher' && req.userRole !== 'master_admin') {
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
          .select("*, books(title, author, isbn)")
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
      .from("borrowed_books")
      .select("*, books(title, author, isbn)") // Join books
      .eq("student_id", targetStudentId)
      .eq('institution_id', req.institution_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (_e) {
    res.status(500).json({ error: "Server error" });
  }
};

/** Admin view: all loans */
exports.getAllBorrowedBooks = async (req, res) => {
  try {
    // Need to join students -> users to get names
    // And books
    const { data, error } = await supabase
      .from("borrowed_books")
      .select(`
        *,
        books (title, author, isbn, category),
        students (
          id,
          grade_level,
          academic_year,
          users (first_name, last_name, full_name, email, phone)
        ),
        teachers (
          id,
          department,
          position,
          users (first_name, last_name, full_name, email, phone)
        )
      `)
      .eq('institution_id', req.institution_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Flatten structure for frontend if needed, or frontend handles it.
    // Frontend likely expects `users.full_name`.
    // We should map it or let frontend adapt.
    // The previous controller returned: `users(full_name, email)` direct relation.
    // Here we have `students -> users`.
    // I will leave it as is, but might need frontend adjustment if it crashes.
    // Actually, I can use a view or just return it.
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/** Update Status */
exports.updateBorrowStatus = async (req, res) => {
  try {
    const { userRole } = req;
    const { borrowId } = req.params;
    const { status } = req.body;

    if (!["admin", "teacher"].includes(userRole)) return res.status(403).json({ error: "Unauthorized" });

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
    const { userRole } = req;
    const { borrowId } = req.params;

    if (!["admin", "teacher"].includes(userRole)) {
      return res.status(403).json({ error: "Unauthorized" });
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
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Admin only." });
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
          message: `${borrowerName}, please return or renew \"${bookTitle}\" if still active.`,
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
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Admin only." });
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
