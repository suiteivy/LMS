const supabase = require("../utils/supabaseClient");

const DEFAULT_MAX_BORROW = 3;
const DEFAULT_BORROW_DAYS = 14;
const FEE_THRESHOLD = 0.5; // 50% required

// Helper: check fee coverage - adapt to fees/payments schema
async function checkFeeThreshold(userId, institutionId) {
  // This function assumes there is a fees/payments setup.
  // Example approach: sum payments and sum invoice/fees for user and compute ratio.
  // If no fees table yet, return true (skip check) or integrate with bursary module.

  // Try to query a 'fees' or 'payments' table if exists:
  try {
    // Example: payments table with fields { student_id, amount, institution_id }
    const { data: payments, error: payErr } = await supabase
      .from("payments")
      .select("amount")
      .eq("student_id", userId)
      .eq("institution_id", institutionId);

    if (payErr) {
      // no payments table or error → we treat as not failing but log
      console.warn("payments check error or table missing", payErr.message);
      return { ok: false, reason: "payments_table_missing" };
    }

    const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

    // Get required fees total (example: fees table with total_due)
    const { data: feesRows, error: feesErr } = await supabase
      .from("fees")
      .select("total_due")
      .eq("student_id", userId)
      .eq("institution_id", institutionId);

    if (feesErr || !feesRows || feesRows.length === 0) {
      // No fees rows → can't check, allow for now (or you can block)
      console.warn("fees table missing or no fees rows", feesErr?.message);
      return { ok: false, reason: "fees_missing" };
    }

    const totalDue = feesRows.reduce((s, f) => s + Number(f.total_due || 0), 0);
    if (totalDue === 0) return { ok: true };

    const ratio = paid / totalDue;
    return { ok: ratio >= FEE_THRESHOLD, paid, totalDue, ratio };
  } catch (err) {
    console.error("checkFeeThreshold error", err);
    return { ok: false, reason: "error" };
  }
}

exports.addOrUpdateBook = async (req, res) => {
  const { userRole, institution_id } = req;
  if (userRole !== "admin")
    return res.status(403).json({ error: "Admin only" });

  const { id, title, author, isbn, total_quantity } = req.body;
  if (!title || typeof total_quantity !== "number") {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const payload = {
    title,
    author,
    isbn,
    total_quantity,
    available_quantity: total_quantity,
    institution_id,
  };

  try {
    const { data, error } = await supabase
      .from("books")
      .upsert([{ id, ...payload }], { onConflict: "id" })
      .select()
      .single();

    if (error) throw error;
    res.status(200).json({ message: "Book saved", book: data });
  } catch (err) {
    console.error("addOrUpdateBook err", err);
    res.status(500).json({ error: err.message || err });
  }
};

exports.listBooks = async (req, res) => {
  const { institution_id } = req;
  try {
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("institution_id", institution_id);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.borrowBook = async (req, res) => {
  const userId = req.user.id;
  const { userRole, institution_id } = req;
  if (userRole !== "student")
    return res.status(403).json({ error: "Only students can borrow" });

  const { book_id, days } = req.body;
  if (!book_id) return res.status(400).json({ error: "book_id required" });

  try {
    // 1) check book availability
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("*")
      .eq("id", book_id)
      .eq("institution_id", institution_id)
      .single();

    if (bookErr || !book)
      return res.status(404).json({ error: "Book not found" });
    if (book.available_quantity <= 0)
      return res.status(400).json({ error: "No copies available" });

    // 2) check overdue books for user
    const { data: overdue, error: overdueErr } = await supabase
      .from("borrowed_books")
      .select("*")
      .eq("user_id", userId)
      .eq("institution_id", institution_id)
      .is("returned_at", null)
      .lt("due_date", new Date().toISOString().slice(0, 10)); // due_date < today

    if (overdueErr) throw overdueErr;
    if (overdue && overdue.length > 0)
      return res.status(400).json({ error: "User has overdue books" });

    // 3) check max borrow count
    const { data: active, error: activeErr } = await supabase
      .from("borrowed_books")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("institution_id", institution_id)
      .is("returned_at", null);

    if (activeErr) throw activeErr;
    const activeCount = Array.isArray(active)
      ? active.length
      : active?.count || 0;
    if (activeCount >= DEFAULT_MAX_BORROW)
      return res.status(400).json({ error: "Borrow limit reached" });

    // 4) check fees threshold (optional — integrates with bursary)
    const feeCheck = await checkFeeThreshold(userId, institution_id);
    if (!feeCheck.ok) {
      // if reason is fees_missing or payments table missing, choose policy:
      // Block if compute  ratio < threshold
      if (
        feeCheck.reason === "fees_missing" ||
        feeCheck.reason === "payments_table_missing"
      ) {
        // policy: if bursary not set up, allow
        console.warn(
          "Fee check inconclusive, allowing borrow (policy).",
          feeCheck
        );
      } else {
        return res
          .status(403)
          .json({ error: "Fee threshold not met for borrowing" });
      }
    }

    // 5) Insert borrowed_books and rely on trigger to decrement available_quantity
    const dueDate = new Date();
    dueDate.setDate(
      dueDate.getDate() +
        (days && Number(days) ? Number(days) : DEFAULT_BORROW_DAYS)
    );

    const { data: borrowData, error: borrowErr } = await supabase
      .from("borrowed_books")
      .insert([
        {
          book_id,
          user_id: userId,
          due_date: dueDate.toISOString().slice(0, 10),
          institution_id,
        },
      ])
      .select()
      .single();

    if (borrowErr) throw borrowErr;

    res.status(201).json({ message: "Book borrowed", borrow: borrowData });
  } catch (err) {
    console.error("borrowBook err", err);
    res.status(500).json({ error: err.message || err });
  }
};

exports.returnBook = async (req, res) => {
  const userId = req.user.id;
  const { userRole, institution_id } = req;
  const { borrow_id } = req.body;
  if (!borrow_id) return res.status(400).json({ error: "borrow_id required" });

  try {
    // find borrow
    const { data: borrow, error: bErr } = await supabase
      .from("borrowed_books")
      .select("*")
      .eq("id", borrow_id)
      .eq("institution_id", institution_id)
      .single();

    if (bErr || !borrow)
      return res.status(404).json({ error: "Borrow record not found" });

    // only student who borrowed or admin can return
    if (userRole !== "admin" && borrow.user_id !== userId) {
      return res.status(403).json({ error: "Not allowed to return this book" });
    }

    // set returned_at
    const { data, error } = await supabase
      .from("borrowed_books")
      .update({ returned_at: new Date().toISOString(), status: "returned" })
      .eq("id", borrow_id)
      .select()
      .single();

    if (error) throw error;

    // trigger will increment available_quantity
    res.json({ message: "Book returned", borrow: data });
  } catch (err) {
    console.error("returnBook err", err);
    res.status(500).json({ error: err.message || err });
  }
};

exports.borrowHistory = async (req, res) => {
  const { userRole, institution_id } = req;
  const studentId = req.params.studentId;
  const requesterId = req.user.id;

  // admin or the user themself only
  if (userRole !== "admin" && requesterId !== studentId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const { data, error } = await supabase
      .from("borrowed_books")
      .select("*, books(title, author, isbn)")
      .eq("user_id", studentId)
      .eq("institution_id", institution_id)
      .order("borrowed_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("borrowHistory err", err);
    res.status(500).json({ error: err.message || err });
  }
};
