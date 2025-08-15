// const supabase = require("../utils/supabaseClient");

// const DEFAULT_MAX_BORROW = 3;
// const DEFAULT_BORROW_DAYS = 14;
// const FEE_THRESHOLD = 0.5; // 50% required

// // Helper: check fee coverage - adapt to fees/payments schema
// async function checkFeeThreshold(userId, courseId) {
//   // This function assumes there is a fees/payments setup.
//   // Example approach: sum payments and sum invoice/fees for user and compute ratio.
//   // If no fees table yet, return true (skip check) or integrate with bursary module.

//   // Try to query a 'fees' or 'payments' table if exists:
//   try {
//     // Example: payments table with fields { student_id, amount, institution_id }
//     // Get course fee
//     const { data: course, error: courseError } = await supabase
//       .from("courses")
//       .select("fee_amount")
//       .eq("id", courseId)
//       .single();

//     if (courseError) {
//       // no payments table or error → we treat as not failing but log
//       console.warn("course check error or table missing", courseError.message);
//       return { ok: false, reason: "course_table_missing" };
//     }

//     // Sum student's payments
//     const { data: payments, error: feeError } = await supabase
//       .from("fees")
//       .select("amount_paid")
//       .eq("student_id", studentId);

//     if (feeError) {
//       console.warn("fees table missing or no fees rows", feesErr?.message);
//       return { ok: false, reason: "fees_missing" };
//     }

//     const totalPaid = payments.reduce((sum, fee) => sum + fee.amount_paid, 0);
//     const threshold = course.fee_amount * 0.5;
//     return { ok: totalPaid >= threshold, totalPaid };
//   } catch (err) {
//     console.error("checkFeeThreshold error", err);
//     return { ok: false, reason: "error" };
//   }
// }

// exports.addOrUpdateBook = async (req, res) => {
//   const { userRole, institution_id } = req;
//   if (userRole !== "admin")
//     return res.status(403).json({ error: "Admin only" });

//   const { id, title, author, isbn, total_quantity } = req.body;
//   if (!title || typeof total_quantity !== "number") {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   const payload = {
//     title,
//     author,
//     isbn,
//     total_quantity,
//     available_quantity: total_quantity,
//     institution_id,
//   };

//   try {
//     const { data, error } = await supabase
//       .from("books")
//       .upsert([{ id, ...payload }], { onConflict: "id" })
//       .select()
//       .single();

//     if (error) throw error;
//     res.status(200).json({ message: "Book saved", book: data });
//   } catch (err) {
//     console.error("addOrUpdateBook err", err);
//     res.status(500).json({ error: err.message || err });
//   }
// };

// exports.listBooks = async (req, res) => {
//   const { institution_id } = req;
//   try {
//     const { data, error } = await supabase
//       .from("books")
//       .select("*")
//       .eq("institution_id", institution_id);

//     if (error) throw error;
//     res.json(data);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.borrowBook = async (req, res) => {
//   const userId = req.user.id;
//   const { userRole, institution_id } = req;
//   if (userRole !== "student")
//     return res.status(403).json({ error: "Only students can borrow" });

//   const { book_id, days } = req.body;
//   if (!book_id) return res.status(400).json({ error: "book_id required" });

//   try {
//     // 1) check book availability
//     const { data: book, error: bookErr } = await supabase
//       .from("books")
//       .select("*")
//       .eq("id", book_id)
//       .eq("institution_id", institution_id)
//       .single();

//     if (bookErr || !book)
//       return res.status(404).json({ error: "Book not found" });
//     if (book.available_quantity <= 0)
//       return res.status(400).json({ error: "No copies available" });

//     // 2) check overdue books for user
//     const { data: overdue, error: overdueErr } = await supabase
//       .from("borrowed_books")
//       .select("*")
//       .eq("user_id", userId)
//       .eq("institution_id", institution_id)
//       .is("returned_at", null)
//       .lt("due_date", new Date().toISOString().slice(0, 10)); // due_date < today

//     if (overdueErr) throw overdueErr;
//     if (overdue && overdue.length > 0)
//       return res.status(400).json({ error: "User has overdue books" });

//     // 3) check max borrow count
//     const { data: active, error: activeErr } = await supabase
//       .from("borrowed_books")
//       .select("*", { count: "exact" })
//       .eq("user_id", userId)
//       .eq("institution_id", institution_id)
//       .is("returned_at", null);

//     if (activeErr) throw activeErr;
//     const activeCount = Array.isArray(active)
//       ? active.length
//       : active?.count || 0;
//     if (activeCount >= DEFAULT_MAX_BORROW)
//       return res.status(400).json({ error: "Borrow limit reached" });

//     // 4) check fees threshold (optional — integrates with bursary)
//     const feeCheck = await checkFeeThreshold(userId, institution_id);
//     if (!feeCheck.ok) {
//       // if reason is fees_missing or payments table missing, choose policy:
//       // Block if compute  ratio < threshold
//       if (
//         feeCheck.reason === "fees_missing" ||
//         feeCheck.reason === "course_table_missing"
//       ) {
//         // policy: if bursary not set up, allow
//         console.warn(
//           "Fee check inconclusive, allowing borrow (policy).",
//           feeCheck
//         );
//       } else {
//         return res
//           .status(403)
//           .json({ error: "Fee threshold not met for borrowing" });
//       }
//     }

//     // 5) Insert borrowed_books and rely on trigger to decrement available_quantity
//     const dueDate = new Date();
//     dueDate.setDate(
//       dueDate.getDate() +
//         (days && Number(days) ? Number(days) : DEFAULT_BORROW_DAYS)
//     );

//     const { data: borrowData, error: borrowErr } = await supabase
//       .from("borrowed_books")
//       .insert([
//         {
//           book_id,
//           user_id: userId,
//           due_date: dueDate.toISOString().slice(0, 10),
//           institution_id,
//         },
//       ])
//       .select()
//       .single();

//     if (borrowErr) throw borrowErr;

//     res.status(201).json({ message: "Book borrowed", borrow: borrowData });
//   } catch (err) {
//     console.error("borrowBook err", err);
//     res.status(500).json({ error: err.message || err });
//   }
// };

// exports.returnBook = async (req, res) => {
//   const userId = req.user.id;
//   const { userRole, institution_id } = req;
//   const { borrow_id } = req.body;
//   if (!borrow_id) return res.status(400).json({ error: "borrow_id required" });

//   try {
//     // find borrow
//     const { data: borrow, error: bErr } = await supabase
//       .from("borrowed_books")
//       .select("*")
//       .eq("id", borrow_id)
//       .eq("institution_id", institution_id)
//       .single();

//     if (bErr || !borrow)
//       return res.status(404).json({ error: "Borrow record not found" });

//     // only student who borrowed or admin can return
//     if (userRole !== "admin" && borrow.user_id !== userId) {
//       return res.status(403).json({ error: "Not allowed to return this book" });
//     }

//     // set returned_at
//     const { data, error } = await supabase
//       .from("borrowed_books")
//       .update({ returned_at: new Date().toISOString(), status: "returned" })
//       .eq("id", borrow_id)
//       .select()
//       .single();

//     if (error) throw error;

//     // trigger will increment available_quantity
//     res.json({ message: "Book returned", borrow: data });
//   } catch (err) {
//     console.error("returnBook err", err);
//     res.status(500).json({ error: err.message || err });
//   }
// };

// exports.borrowHistory = async (req, res) => {
//   const { userRole, institution_id } = req;
//   const studentId = req.params.studentId;
//   const requesterId = req.user.id;

//   // admin or the user themself only
//   if (userRole !== "admin" && requesterId !== studentId) {
//     return res.status(403).json({ error: "Not authorized" });
//   }

//   try {
//     const { data, error } = await supabase
//       .from("borrowed_books")
//       .select("*, books(title, author, isbn)")
//       .eq("user_id", studentId)
//       .eq("institution_id", institution_id)
//       .order("borrowed_at", { ascending: false });

//     if (error) throw error;
//     res.json(data);
//   } catch (err) {
//     console.error("borrowHistory err", err);
//     res.status(500).json({ error: err.message || err });
//   }
// };







// controllers/libraryController.js
const supabase = require("../utils/supabaseClient");

/** Pull active config, fall back to sane defaults */
async function getActiveConfig() {
  const { data, error } = await supabase
    .from("config")
    .select(
      "min_fee_percent_for_borrow, default_borrow_limit"
    )
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
    const appUserId = req.user.id; // equals auth.users.id AND public.users.id in your setup
    if (!["student"].includes(userRole)) {
      return res.status(403).json({ error: "Students only." });
    }

    const { book_id, days = 14 } = req.body;
    if (!book_id) return res.status(400).json({ error: "book_id is required" });

    // 1) Book must exist in same institution with stock
    const { data: book, error: bookErr } = await supabase
      .from("books")
      .select("*")
      .eq("id", book_id)
      .eq("institution_id", institution_id)
      .single();
    if (bookErr || !book) return res.status(404).json({ error: "Book not found" });
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
          book_id,
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
      p_book_id: book_id,
    });
    // If you don't have RPC, do direct update:
    if (decErr) {
      await supabase
        .from("books")
        .update({ available_quantity: book.available_quantity - 1 })
        .eq("id", book_id)
        .eq("institution_id", institution_id);
    }

    return res
      .status(201)
      .json({ message: "Borrowed", borrow: borrowRow, due_date: dueDate });
  } catch (e) {
    console.error("borrowBook error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

/** Return a borrowed book (student or admin) */
exports.returnBook = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    const appUserId = req.user.id;

    const { borrow_id } = req.body;
    if (!borrow_id)
      return res.status(400).json({ error: "borrow_id is required" });

    // Fetch borrow row
    const { data: row, error: rowErr } = await supabase
      .from("borrowed_books")
      .select("*")
      .eq("id", borrow_id)
      .eq("institution_id", institution_id)
      .single();

    if (rowErr || !row) return res.status(404).json({ error: "Not found" });
    if (row.returned_at)
      return res.status(400).json({ error: "Already returned" });

    // Students can only return their own; admins can return any
    if (userRole !== "admin" && row.user_id !== appUserId) {
      return res.status(403).json({ error: "Not allowed" });
    }

    // mark returned
    const nowIso = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("borrowed_books")
      .update({ returned_at: nowIso, status: "returned" })
      .eq("id", borrow_id)
      .eq("institution_id", institution_id);
    if (updErr) return res.status(500).json({ error: updErr.message });

    // increment stock
    const { error: incErr } = await supabase.rpc("increment_book_stock", {
      p_book_id: row.book_id,
    });
    if (incErr) {
      // fallback direct update
      await supabase.rpc("safe_increment_book_stock", { p_book_id: row.book_id })
        .catch(async () => {
          // final fallback: naive increment
          await supabase
            .from("books")
            .update({ available_quantity: (row.available_quantity || 0) + 1 })
            .eq("id", row.book_id)
            .eq("institution_id", institution_id);
        });
    }

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
      userRole === "admin" && studentId ? studentId : req.user.id;

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
