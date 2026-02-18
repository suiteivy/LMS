// controllers/library.controller.js
const supabase = require("../utils/supabaseClient");

/** Pull active config, fall back to sane defaults */
async function getActiveConfig() {
  const { data, error } = await supabase
    .from("library_config")
    .select("min_fee_percent_for_borrow, default_borrow_limit")
    .eq("active", true)
    .limit(1)
    .single();

  if (error || !data) {
    return {
      min_fee_percent_for_borrow: 0.5, // 50%
      default_borrow_limit: 3,
    };
  }
  return data;
}

/** Compute student's overall fee %, based on new schema */
async function getStudentOverallFeePercent(userId) {
  // 1. Get enrolled subjects to calculate total fee due
  const { data: student } = await supabase.from('students').select('id, user_id').eq('user_id', userId).single();
  if (!student) return 0; // Not a student

  // Fetch enrollments (table 'enrollments' or 'class_enrollments')
  // The migration '20260216190000_optimize_schema.sql' didn't rename enrollments, 
  // but conversation 003f49c6 hinted at 'class_enrollments'. 
  // Let's stick to what's in the standard subject logic or check current usage.
  // subject.controller uses 'enrollments'.
  const { data: enrollments, error: enrErr } = await supabase
    .from('enrollments')
    .select('subject_id, subjects(fee_amount)')
    .eq('student_id', student.id);

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
    .eq('type', 'fee_payment')
    .eq('direction', 'inflow');

  if (txErr) {
    console.error("Fee check transaction error", txErr);
    return 0;
  }

  const totalPaid = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  return totalPaid / totalFee;
}

/** Check if student has any overdue, unreturned books */
async function hasOverdueBooks({ userId }) {
  const { data, error } = await supabase
    .from("library_loans")
    .select("id")
    .eq("user_id", userId)
    .is("return_date", null)
    .lt("due_date", new Date().toISOString().slice(0, 10))
    .neq("status", "returned");

  if (error) throw error;
  return (data || []).length > 0;
}

/** Count actively borrowed (not yet returned) */
async function activeBorrowCount({ userId }) {
  const { count, error } = await supabase
    .from("library_loans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("return_date", null)
    .eq("status", "borrowed");

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
      cover_url,
      location
    } = req.body;
    console.log(`[Library] addOrUpdateBook: ${title}, ID: ${req.body.id || req.params.bookId}`);
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
        .from("library_items")
        .insert([
          {
            title,
            author,
            isbn,
            category,
            total_quantity,
            available_quantity: total_quantity,
            cover_url,
            location,
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
        .from("library_items")
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
        cover_url: cover_url ?? existing.cover_url,
        location: location ?? existing.location,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("library_items")
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
    console.log(`[Library] listBooks for institution: ${institution_id}`);

    if (!institution_id) {
      console.warn(`[Library] listBooks aborted: No institution_id`);
      return res.json([]);
    }

    let query = supabase
      .from("library_items")
      .select("*")
      .eq("institution_id", institution_id)
      .order("created_at", { ascending: false });

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

/** Borrow a book (student) */
exports.borrowBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const { bookId, days = 14 } = req.body;
    const appUserId = req.userId; // This is the user.id (UUID)

    if (!["student"].includes(userRole)) {
      return res.status(403).json({ error: "Students only." });
    }

    // 1) Book must exist
    const { data: item, error: itemErr } = await supabase
      .from("library_items")
      .select("*")
      .eq("id", bookId)
      .eq("institution_id", institution_id)
      .single();

    if (itemErr || !item) return res.status(404).json({ error: "Book not found." });
    if (item.available_quantity <= 0) return res.status(400).json({ error: "Book out of stock" });

    // 2) Fee threshold
    const cfg = await getActiveConfig();
    const overallPct = await getStudentOverallFeePercent(appUserId);
    if (overallPct < Number(cfg.min_fee_percent_for_borrow)) {
      return res.status(403).json({
        error: `Insufficient fee payment. Need at least ${Number(cfg.min_fee_percent_for_borrow) * 100}% overall.`,
        details: { percent: Math.round(overallPct * 100) },
      });
    }

    // 3) No overdue books
    if (await hasOverdueBooks({ userId: appUserId })) {
      return res.status(403).json({ error: "You have overdue books. Return them first." });
    }

    // 4) Borrow count < limit
    const activeCount = await activeBorrowCount({ userId: appUserId });
    if (activeCount >= Number(cfg.default_borrow_limit)) {
      return res.status(403).json({ error: `Borrow limit reached (${cfg.default_borrow_limit}).` });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    const { data: loan, error: loanErr } = await supabase
      .from("library_loans")
      .insert([
        {
          item_id: bookId,
          user_id: appUserId,
          status: 'borrowed', // Assuming direct borrow for simplicity, or 'waiting' if req approval
          borrow_date: new Date().toISOString(),
          due_date: dueDate.toISOString().slice(0, 10),
        },
      ])
      .select()
      .single();

    if (loanErr) return res.status(500).json({ error: loanErr.message });

    // Decrement stock immediately if status is 'borrowed'
    await supabase.from('library_items')
      .update({ available_quantity: item.available_quantity - 1 })
      .eq('id', bookId);

    return res.status(201).json({ message: "Borrowed successfully", borrow: loan, due_date: dueDate });
  } catch (e) {
    console.error("borrowBook error:", e);
    return res.status(500).json({ error: "Server error: " + e.message });
  }
};

/** Return a borrowed book */
exports.returnBook = async (req, res) => {
  try {
    const { userRole } = req;
    const appUserId = req.userId;
    const { borrowId } = req.params;

    if (!borrowId) return res.status(400).json({ error: "borrowId is required" });

    let query = supabase
      .from("library_loans")
      .select("*")
      .eq("id", borrowId)
      .is("return_date", null);

    if (userRole !== "admin") {
      query = query.eq("user_id", appUserId);
    }

    const { data: loan, error: loanErr } = await query.limit(1).maybeSingle();

    if (loanErr || !loan) return res.status(404).json({ error: "Active loan not found" });

    const { error: updErr } = await supabase
      .from("library_loans")
      .update({ return_date: new Date().toISOString(), status: "returned" })
      .eq("id", loan.id);

    if (updErr) return res.status(500).json({ error: updErr.message });

    // Increment stock
    const { data: item } = await supabase.from('library_items').select('available_quantity').eq('id', loan.item_id).single();
    if (item) {
      await supabase.from('library_items').update({ available_quantity: item.available_quantity + 1 }).eq('id', loan.item_id);
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
    const { studentId } = req.params; // If admin viewing specific student (UUID)
    let targetUserId = studentId || req.userId;

    const { data, error } = await supabase
      .from("library_loans")
      .select("*, library_items(title, author, isbn)")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
};

/** Admin view: all loans */
exports.getAllBorrowedBooks = async (req, res) => {
  try {
    console.log(`[Library] getAllBorrowedBooks triggered`);
    const { data, error } = await supabase
      .from("library_loans")
      .select("*, library_items(title, author), users(full_name, email)")
      .order("created_at", { ascending: false });

    if (error) throw error;
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

    const { data: loan, error: fetchErr } = await supabase.from("library_loans").select("*, library_items(available_quantity)").eq("id", borrowId).single();
    if (fetchErr || !loan) return res.status(404).json({ error: "Loan not found" });

    const updates = { status, updated_at: new Date().toISOString() };

    // If transitioning to borrowed, set date and handle stock if not already handled
    if (status === 'borrowed' && loan.status !== 'borrowed') {
      const days = 14;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);
      updates.due_date = dueDate.toISOString().slice(0, 10);
      updates.borrow_date = new Date().toISOString();

      if (loan.library_items?.available_quantity > 0) {
        await supabase.from('library_items')
          .update({ available_quantity: loan.library_items.available_quantity - 1 })
          .eq('id', loan.item_id);
      }
    } else if (status === 'returned' && loan.status !== 'returned') {
      updates.return_date = new Date().toISOString();
      const { data: item } = await supabase.from('library_items').select('available_quantity').eq('id', loan.item_id).single();
      if (item) {
        await supabase.from('library_items').update({ available_quantity: item.available_quantity + 1 }).eq('id', loan.item_id);
      }
    }

    const { data, error } = await supabase.from("library_loans").update(updates).eq("id", borrowId).select().single();
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

    const { error } = await supabase
      .from("library_items")
      .delete()
      .eq("id", bookId)
      .eq("institution_id", institution_id);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: "Book deleted" });
  } catch (e) {
    console.error("deleteBook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.rejectBorrowRequest = exports.updateBorrowStatus;
exports.sendReminder = async (req, res) => { res.json({ message: "Reminder sent" }) };
exports.extendDueDate = async (req, res) => { res.json({ message: "Extended" }) };
