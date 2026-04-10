// controllers/timetable.controller.js
const supabase = require("../utils/supabaseClient.js");

// ── Shared helpers ────────────────────────────────────────────────────────────

const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const overlaps = (s1, e1, s2, e2) => s1 < e2 && s2 < e1;

/**
 * Run institution-wide conflict checks before inserting/updating.
 * Returns an array of human-readable conflict strings (empty = clean).
 * excludeId: entry id to skip when updating (so we don't conflict with self).
 */
async function checkConflicts(
  { class_id, subject_id, day_of_week, start_time, end_time, room_number },
  institution_id,
  excludeId = null,
) {
  const issues = [];

  // Fetch all timetable entries for this institution on the same day
  let query = supabase
    .from("timetables")
    .select(
      "id, class_id, subject_id, start_time, end_time, room_number, subjects(teacher_id)",
    )
    .eq("institution_id", institution_id)
    .eq("day_of_week", day_of_week);

  if (excludeId) query = query.neq("id", excludeId);

  const { data: existing } = await query;
  if (!existing || existing.length === 0) return issues;

  const ns = toMin(start_time);
  const ne = toMin(end_time);

  // Fetch teacher_id for the incoming subject
  const { data: subjectRow } = await supabase
    .from("subjects")
    .select("teacher_id")
    .eq("id", subject_id)
    .single();
  const incomingTeacherId = subjectRow?.teacher_id ?? null;

  for (const e of existing) {
    const es = toMin(e.start_time);
    const ee = toMin(e.end_time);
    if (!overlaps(ns, ne, es, ee)) continue;

    // Same class double-booking
    if (e.class_id === class_id) {
      issues.push(
        `This class already has a subject scheduled at overlapping times (${e.start_time.slice(0, 5)}–${e.end_time.slice(0, 5)})`,
      );
    }

    // Room clash (institution-wide)
    if (
      room_number &&
      e.room_number &&
      e.room_number.trim().toLowerCase() === room_number.trim().toLowerCase() &&
      e.class_id !== class_id
    ) {
      issues.push(
        `Room "${room_number}" is already booked to another class at overlapping times on ${day_of_week}`,
      );
    }

    // Teacher double-booking (institution-wide)
    const existingTeacherId = e.subjects?.teacher_id ?? null;
    if (
      incomingTeacherId &&
      existingTeacherId &&
      incomingTeacherId === existingTeacherId &&
      e.class_id !== class_id
    ) {
      issues.push(
        `The assigned teacher is already teaching another class at overlapping times on ${day_of_week}`,
      );
    }
  }

  return issues;
}

/**
 * Create a new timetable entry — Admin only
 */
exports.createTimetableEntry = async (req, res) => {
  try {
    const { userRole, institution_id } = req;
    if (userRole !== "admin") {
      return res.status(403).json({ error: "Admin only." });
    }

    const {
      class_id,
      subject_id,
      day_of_week,
      start_time,
      end_time,
      room_number,
    } = req.body;

    if (!class_id || !subject_id || !day_of_week || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Institution-wide conflict check
    const issues = await checkConflicts(
      { class_id, subject_id, day_of_week, start_time, end_time, room_number },
      institution_id,
    );
    if (issues.length > 0) {
      return res.status(409).json({ error: issues[0], conflicts: issues });
    }

    const { data, error } = await supabase
      .from("timetables")
      .insert([
        {
          class_id,
          subject_id,
          day_of_week,
          start_time,
          end_time,
          room_number,
          institution_id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: "Timetable entry created", entry: data });
  } catch (err) {
    console.error("Create timetable error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get timetable for a class
 */
exports.getClassTimetable = async (req, res) => {
  try {
    const { class_id } = req.params;
    const institution_id =
      req.institution_id && req.institution_id !== "null"
        ? req.institution_id
        : null;

    if (!institution_id)
      return res.status(400).json({ error: "Missing institution context" });

    const { data, error } = await supabase
      .from("timetables")
      .select(
        `
        id, day_of_week, start_time, end_time, room_number,
        subjects ( title, teacher_id, teachers(users(full_name)) )
      `,
      )
      .eq("class_id", class_id)
      .eq("institution_id", institution_id)
      .order("start_time", { ascending: true }); // Need custom sort for days normally, but this sorts time

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Get class timetable error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get teacher's timetable
 * Uses a two-step query because Supabase JS v2 `.eq("joined_table.col", val)`
 * filters joined columns, NOT rows. We must resolve subject IDs first.
 */
exports.getTeacherTimetable = async (req, res) => {
  try {
    const institution_id =
      req.institution_id && req.institution_id !== "null"
        ? req.institution_id
        : null;
    if (!institution_id)
      return res.status(400).json({ error: "Missing institution context" });

    // Admin can pass teacher_id as param; teachers use their own profile
    let teacherId = req.params.teacher_id;

    if (!teacherId && req.userRole === "teacher") {
      const { data: t } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", req.userId)
        .single();
      teacherId = t?.id;
    }

    if (!teacherId)
      return res.status(400).json({ error: "Teacher ID required" });

    // Step 1: Get subject IDs taught by this teacher
    const { data: subjectRows, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("teacher_id", teacherId)
      .eq("institution_id", institution_id);

    if (subjectError) throw subjectError;

    const subjectIds = (subjectRows || []).map((s) => s.id);

    if (subjectIds.length === 0) {
      return res.json([]); // Teacher has no assigned subjects yet
    }

    // Step 2: Fetch timetable rows for those subjects
    const { data, error } = await supabase
      .from("timetables")
      .select(
        `
        id, day_of_week, start_time, end_time, room_number,
        classes ( name ),
        subjects ( title )
        `,
      )
      .in("subject_id", subjectIds)
      .eq("institution_id", institution_id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Get teacher timetable error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update entry
 */
exports.updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { userRole, institution_id } = req;
    if (userRole !== "admin")
      return res.status(403).json({ error: "Admin only" });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.created_at;

    // If timing/room/subject fields are being changed, re-run conflict check
    const needsCheck =
      updates.day_of_week ||
      updates.start_time ||
      updates.end_time ||
      updates.room_number !== undefined ||
      updates.subject_id;

    if (needsCheck) {
      // Fetch the existing entry to fill in any fields not being updated
      const { data: current } = await supabase
        .from("timetables")
        .select(
          "class_id, subject_id, day_of_week, start_time, end_time, room_number",
        )
        .eq("id", id)
        .single();
      if (current) {
        const merged = { ...current, ...updates };
        const issues = await checkConflicts(merged, institution_id, id);
        if (issues.length > 0) {
          return res.status(409).json({ error: issues[0], conflicts: issues });
        }
      }
    }

    const { data, error } = await supabase
      .from("timetables")
      .update(updates)
      .eq("id", id)
      .eq("institution_id", institution_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ message: "Updated", entry: data });
  } catch (err) {
    console.error("Update timetable error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete entry
 */
exports.deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { userRole, institution_id } = req;
    if (userRole !== "admin")
      return res.status(403).json({ error: "Admin only" });

    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", id)
      .eq("institution_id", institution_id);
    if (error) throw error;
    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Delete timetable error:", err);
    res.status(500).json({ error: err.message });
  }
};
