// controllers/libraryController.js
const supabase = require("../utils/supabaseClient");

/** Pull active config, fall back to sane defaults */
async function getActiveConfig() {
  const { data, error } = await supabase
    .from("config")
    .select("min_fee_percent_for_borrow, default_borrow_limit")
    .eq("active", true)
    .order("effective_from", { ascending: false })
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

/** Compute student's overall fee %, based on latest schema */
async function getStudentOverallFeePercent(studentAuthId) {
  // fees.student_id references auth.users(id)
  const { data, error } = await supabase
    .from("fees")
    .select("total_fee, amount_paid");

  if (error) throw error;

  const rows = (data || []).filter((r) => r.student_id === studentAuthId);

  const totalFee = rows.reduce((sum, r) => sum + Number(r.total_fee || 0), 0);
  const totalPaid = rows.reduce(
    (sum, r) => sum + Number(r.amount_paid || 0),
    0
  );

  if (totalFee <= 0) return 0; // no fees set up -> treat as 0%
  return totalPaid / totalFee; // returns 0..1
}

/** Check if student has any overdue, unreturned books */
async function hasOverdueBooks({ userId, institution_id }) {
  const { data, error } = await supabase
    .from("borrowed_books")
    .select("id")
    .eq("user_id", userId)
    .eq("institution_id", institution_id)
    .is("returned_at", null)
    .lt("due_date", new Date().toISOString().slice(0, 10)); // compare by date

  if (error) throw error;
  return (data || []).length > 0;
}

/** Count actively borrowed (not yet returned) */
async function activeBorrowCount({ userId, institution_id }) {
  const { data, error } = await supabase
    .from("borrowed_books")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("institution_id", institution_id)
    .is("returned_at", null);

  if (error) throw error;
  return data?.length ?? 0; // for safety; supabase-js v2 returns count on `count` prop in older versions
}

/** Admin only: add or update a book */
exports.addOrUpdateBook = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      id, // optional for update
      title,
      author,
      isbn,
      total_quantity,
    } = req.body;
    const institution_id = req.institution_id;

    if (!title || total_quantity == null) {
      return res
        .status(400)
        .json({ error: "title and total_quantity are required" });
    }

    if (total_quantity < 0) {
      return res
        .status(400)
        .json({ error: "total_quantity cannot be negative" });
    }

    // On create, available_quantity should equal total_quantity
    // On update, if total_quantity changes, we keep available_quantity in sync only if
    // the caller passes an explicit available_quantity. Otherwise leave it as-is.
    if (!id) {
      const { data, error } = await supabase
        .from("books")
        .insert([
          {
            title,
            author,
            isbn,
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
      // fetch current to decide available_quantity behavior
      const { data: existing, error: fetchErr } = await supabase
        .from("books")
        .select("*")
        .eq("id", id)
        .eq("institution_id", institution_id)
        .single();

      if (fetchErr || !existing)
        return res.status(404).json({ error: "Book not found" });

      const update = {
        title: title ?? existing.title,
        author: author ?? existing.author,
        isbn: isbn ?? existing.isbn,
        total_quantity: total_quantity ?? existing.total_quantity,
      };

      const { data, error } = await supabase
        .from("books")
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

/** List books (optionally include unavailable) */
exports.listBooks = async (req, res) => {
  try {
    const { institution_id } = req;
    console.log("Listing books for institution:", institution_id);
    const includeUnavailable =
      (req.query.includeUnavailable || "").toString().toLowerCase() === "true";

    let query = supabase
      .from("books")
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

/** Borrow a book (student) with validations */
exports.borrowBook = async (req, res) => {
  try {
    const { userRole, user, institution_id } = req;
    const appUserId = req.userId; // equals auth.users.id AND public.users.id in your setup
    if (!["student"].includes(userRole)) {
      return res.status(403).json({ error: "Students only." });
    }

    const { bookId } = req.params;
    console.log("Borrowing book:", bookId);
    const { days = 14 } = req.body;
    if (!bookId) return res.status(400).json({ error: "bookId is required" });

    // 1) Book must exist in same institution with stock
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("*")
      .eq("id", bookId)
      .eq("institution_id", institution_id)
      .single();
    if (bookErr || !book)
      return res.status(404).json({ error: "Book not found: " + bookErr });
    if (book.available_quantity <= 0)
      return res.status(400).json({ error: "Book out of stock" });

    // 2) Fee threshold
    const cfg = await getActiveConfig();
    const overallPct = await getStudentOverallFeePercent(user.id); // 0..1
    if (overallPct < Number(cfg.min_fee_percent_for_borrow)) {
      return res.status(403).json({
        error: `Insufficient fee payment. Need at least ${
          Number(cfg.min_fee_percent_for_borrow) * 100
        }% overall.`,
        details: { percent: Math.round(overallPct * 100) },
      });
    }

    // 3) No overdue books
    if (await hasOverdueBooks({ userId: appUserId, institution_id })) {
      return res
        .status(403)
        .json({ error: "You have overdue books. Return them first." });
    }

    // 4) Borrow count < limit
    const activeCount = await activeBorrowCount({
      userId: appUserId,
      institution_id,
    });
    if (activeCount >= Number(cfg.default_borrow_limit)) {
      return res.status(403).json({
        error: `Borrow limit reached (${cfg.default_borrow_limit}).`,
      });
    }

    // 5) Create borrow row and decrement stock (explicitly)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + Number(days));

    const { data: borrowRow, error: borrowErr } = await supabase
      .from("borrowed_books")
      .insert([
        {
          book_id: bookId,
          user_id: appUserId,
          institution_id,
          due_date: dueDate.toISOString().slice(0, 10), // date only
          status: "borrowed",
        },
      ])
      .select()
      .single();
    if (borrowErr) return res.status(500).json({ error: borrowErr.message });

    const { error: decErr } = await supabase.rpc("decrement_book_stock", {
      p_bookId: bookId,
    });
    // If you don't have RPC, do direct update:
    if (decErr) {
      await supabase
        .from("books")
        .update({ available_quantity: book.available_quantity - 1 })
        .eq("id", bookId)
        .eq("institution_id", institution_id);
    }

    return res
      .status(201)
      .json({ message: "Borrowed", borrow: borrowRow, due_date: dueDate });
  } catch (e) {
    console.error("borrowBook error:", e);
    return res.status(500).json({ error: "Server error: " + e.message });
  }
};

/** Return a borrowed book (student or admin) */
exports.returnBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const appUserId = req.userId;
    const { bookId } = req.params;

    if (!bookId) return res.status(400).json({ error: "bookId is required" });

    // Fetch borrow row (student = their own, admin = any)
    let query = supabase
      .from("borrowed_books")
      .select("*")
      .eq("book_id", bookId)
      .eq("institution_id", institution_id)
      .is("returned_at", null);

    if (userRole !== "admin") {
      query = query.eq("user_id", appUserId);
    }

    const { data: row, error: rowErr } = await query
      .order("borrowed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rowErr || !row) {
      return res
        .status(404)
        .json({ error: "Active borrow not found: " + rowErr?.message });
    }

    // Mark as returned
    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("borrowed_books")
      .update({ returned_at: nowIso, status: "returned" })
      .eq("id", row.id)
      .eq("institution_id", institution_id);
    if (updErr) return res.status(500).json({ error: updErr.message });

    return res.json({ message: "Returned" });
  } catch (e) {
    console.error("returnBook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/** Borrowing history; admin can view anyone, student can view self */
exports.history = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const { studentId } = req.params;

    const targetUserId =
      userRole === "admin" && studentId ? studentId : req.userId;

    const { data, error } = await supabase
      .from("borrowed_books")
      .select(
        "id, book_id, borrowed_at, returned_at, due_date, status, books(title, author, isbn)"
      )
      .eq("user_id", targetUserId)
      .eq("institution_id", institution_id)
      .order("borrowed_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e) {
    console.error("history error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};
