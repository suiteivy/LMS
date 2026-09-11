const supabase = require("../utils/supabaseClient.js");
const { sendBulkInAppNotificationsWithHistory } = require("./notificationDelivery.service.js");
const { isTransientSupabaseError } = require("../utils/supabaseRetry.js");

const toIsoDateString = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

/**
 * Sweep upcoming assignments due within the next 24 hours.
 * Notifies students enrolled in the class/subject, their parents, and the assigning teacher.
 */
const sweepUpcomingAssignments = async (now = new Date()) => {
  const nowIso = now.toISOString();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  // Find assignments due between now and next 24h
  const { data: assignments, error } = await supabase
    .from("assignments")
    .select("id, title, due_date, subject_id, class_id, institution_id, teacher_id, subjects(title)")
    .gte("due_date", nowIso)
    .lte("due_date", next24h)
    .eq("is_published", true);

  if (error || !assignments || assignments.length === 0) {
    return [];
  }

  const notifications = [];

  for (const assign of assignments) {
    const dedupPrefix = `assign_due_${assign.id}_${toIsoDateString(assign.due_date)}`;

    // Query enrolled students
    let studentIds = [];
    if (assign.class_id) {
      const { data: classEnrollments } = await supabase
        .from("class_enrollments")
        .select("student_id")
        .eq("class_id", assign.class_id)
        .eq("status", "enrolled");
      studentIds = (classEnrollments || []).map((e) => e.student_id).filter(Boolean);
    } else if (assign.subject_id) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id")
        .eq("subject_id", assign.subject_id)
        .eq("status", "enrolled");
      studentIds = (enrollments || []).map((e) => e.student_id).filter(Boolean);
    }

    if (studentIds.length === 0) continue;

    // Fetch user IDs for these students
    const { data: studentUsers } = await supabase
      .from("students")
      .select("id, user_id")
      .in("id", studentIds);

    const studentUserMap = new Map((studentUsers || []).map((s) => [s.id, s.user_id]));

    // Query parents linked to these students
    const { data: parentLinks } = await supabase
      .from("parent_students")
      .select("student_id, parent:parents(user_id)")
      .in("student_id", studentIds);

    const subjectTitle = assign.subjects?.title || "Subject";
    const dueFormatted = new Date(assign.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Notify students
    for (const studentId of studentIds) {
      const userId = studentUserMap.get(studentId);
      if (!userId) continue;

      notifications.push({
        user_id: userId,
        institution_id: assign.institution_id,
        title: `Assignment Due Soon: ${assign.title}`,
        message: `Your assignment "${assign.title}" for ${subjectTitle} is due at ${dueFormatted}.`,
        type: "warning",
        data: {
          source: "assignment",
          assignment_id: assign.id,
          subject_id: assign.subject_id,
          due_date: assign.due_date,
          dedup_key: `${dedupPrefix}_stu_${userId}`,
        },
      });
    }

    // 2. Notify parents
    for (const link of parentLinks || []) {
      const parentUserId = link.parent?.user_id;
      if (!parentUserId) continue;

      notifications.push({
        user_id: parentUserId,
        institution_id: assign.institution_id,
        title: `Child Assignment Due Soon: ${assign.title}`,
        message: `Your child has an assignment due soon in ${subjectTitle} ("${assign.title}").`,
        type: "info",
        data: {
          source: "assignment",
          assignment_id: assign.id,
          student_id: link.student_id,
          due_date: assign.due_date,
          dedup_key: `${dedupPrefix}_par_${parentUserId}`,
        },
      });
    }

    // 3. Notify teacher (reminder to review / grade)
    if (assign.teacher_id) {
      const { data: teacher } = await supabase
        .from("teachers")
        .select("user_id")
        .eq("id", assign.teacher_id)
        .single();

      if (teacher?.user_id) {
        notifications.push({
          user_id: teacher.user_id,
          institution_id: assign.institution_id,
          title: `Assignment Due: ${assign.title}`,
          message: `Submissions for "${assign.title}" (${subjectTitle}) are due at ${dueFormatted}.`,
          type: "info",
          data: {
            source: "assignment",
            assignment_id: assign.id,
            due_date: assign.due_date,
            dedup_key: `${dedupPrefix}_tea_${teacher.user_id}`,
          },
        });
      }
    }
  }

  return notifications;
};

/**
 * Sweep upcoming calendar events occurring in the next 24 hours.
 */
const sweepUpcomingCalendarEvents = async (now = new Date()) => {
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const targetDateStr = toIsoDateString(tomorrow);

  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("id, title, description, event_date, start_time, end_time, event_type, target_audience, institution_id")
    .eq("event_date", targetDateStr);

  if (error || !events || events.length === 0) {
    return [];
  }

  const notifications = [];

  for (const event of events) {
    const dedupPrefix = `cal_event_${event.id}_${event.event_date}`;
    const audience = event.target_audience || "all";

    // Find users by target audience
    let userQuery = supabase
      .from("users")
      .select("id, role")
      .eq("institution_id", event.institution_id);

    if (audience === "teachers") {
      userQuery = userQuery.eq("role", "teacher");
    } else if (audience === "students") {
      userQuery = userQuery.eq("role", "student");
    } else if (audience === "parents") {
      userQuery = userQuery.eq("role", "parent");
    } else if (audience === "staff") {
      userQuery = userQuery.in("role", ["teacher", "admin"]);
    }

    const { data: users } = await userQuery;
    if (!users || users.length === 0) continue;

    const timeLabel = event.start_time ? ` at ${event.start_time.slice(0, 5)}` : "";

    for (const u of users) {
      notifications.push({
        user_id: u.id,
        institution_id: event.institution_id,
        title: `Upcoming Event Tomorrow: ${event.title}`,
        message: `${event.title}${timeLabel} is scheduled for tomorrow. ${event.description || ''}`.trim(),
        type: event.event_type === "exam" ? "warning" : "info",
        data: {
          source: "calendar_event",
          event_id: event.id,
          event_date: event.event_date,
          event_type: event.event_type,
          dedup_key: `${dedupPrefix}_${u.id}`,
        },
      });
    }
  }

  return notifications;
};

/**
 * Sweep approaching attendance deadlines (terms.attendance_deadline within 48h).
 * Notifies teachers and admins.
 */
const sweepApproachingAttendanceDeadlines = async (now = new Date()) => {
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const in48hStr = toIsoDateString(in48h);
  const todayStr = toIsoDateString(now);

  const { data: terms, error } = await supabase
    .from("terms")
    .select("id, name, attendance_deadline, institution_id")
    .gte("attendance_deadline", todayStr)
    .lte("attendance_deadline", in48hStr);

  if (error || !terms || terms.length === 0) {
    return [];
  }

  const notifications = [];

  for (const term of terms) {
    const dedupPrefix = `att_deadline_${term.id}_${term.attendance_deadline}`;

    // Notify all teachers and admins in that institution
    const { data: staffUsers } = await supabase
      .from("users")
      .select("id, role")
      .eq("institution_id", term.institution_id)
      .in("role", ["teacher", "admin"]);

    for (const staff of staffUsers || []) {
      const isTeacher = staff.role === "teacher";
      notifications.push({
        user_id: staff.id,
        institution_id: term.institution_id,
        title: isTeacher ? "Attendance Deadline Approaching" : "Term Attendance Lock Approaching",
        message: isTeacher
          ? `Attendance submissions for "${term.name}" will lock on ${term.attendance_deadline}. Please complete all class records.`
          : `The attendance lock deadline for "${term.name}" is ${term.attendance_deadline}.`,
        type: "warning",
        data: {
          source: "attendance_deadline",
          term_id: term.id,
          deadline: term.attendance_deadline,
          dedup_key: `${dedupPrefix}_${staff.id}`,
        },
      });
    }
  }

  return notifications;
};

/**
 * Filter out any notifications that were already delivered using dedup_key.
 */
const deduplicateNotifications = async (notifications) => {
  if (!notifications || notifications.length === 0) return [];

  const dedupKeys = notifications
    .map((n) => n?.data?.dedup_key)
    .filter(Boolean);

  if (dedupKeys.length === 0) return notifications;

  // Query recent notifications to check for existing dedup_key
  const { data: existing } = await supabase
    .from("notifications")
    .select("data")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  const existingKeys = new Set();
  (existing || []).forEach((row) => {
    const key = row?.data?.dedup_key;
    if (key) existingKeys.add(key);
  });

  // Keep only notifications not already in existingKeys and not duplicated within batch
  const seenInBatch = new Set();
  return notifications.filter((n) => {
    const key = n?.data?.dedup_key;
    if (!key) return true;
    if (existingKeys.has(key) || seenInBatch.has(key)) return false;
    seenInBatch.add(key);
    return true;
  });
};

/**
 * Master sweep executing all event reminder sweeps.
 */
const runUpcomingEventRemindersSweep = async ({ now = new Date() } = {}) => {
  const [assignNotifs, calNotifs, attNotifs] = await Promise.all([
    sweepUpcomingAssignments(now).catch((err) => {
      console.error("[runUpcomingEventRemindersSweep] assign sweep error:", err);
      return [];
    }),
    sweepUpcomingCalendarEvents(now).catch((err) => {
      console.error("[runUpcomingEventRemindersSweep] cal sweep error:", err);
      return [];
    }),
    sweepApproachingAttendanceDeadlines(now).catch((err) => {
      console.error("[runUpcomingEventRemindersSweep] att sweep error:", err);
      return [];
    }),
  ]);

  const combined = [...assignNotifs, ...calNotifs, ...attNotifs];
  if (combined.length === 0) {
    return { queued: 0, delivered: 0 };
  }

  const deduped = await deduplicateNotifications(combined);
  if (deduped.length === 0) {
    return { queued: 0, delivered: 0, skippedDedup: combined.length };
  }

  const delivered = await sendBulkInAppNotificationsWithHistory(deduped);
  return {
    queued: deduped.length,
    delivered: (delivered || []).length,
    totalEvaluated: combined.length,
  };
};

/**
 * Runner with retry resilience.
 */
const runUpcomingEventRemindersSweepWithRetry = async ({ attempts = 3, baseDelayMs = 1500, now } = {}) => {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await runUpcomingEventRemindersSweep({ now });
    } catch (err) {
      lastError = err;
      if (!isTransientSupabaseError(err) || attempt === attempts) {
        throw err;
      }
      const backoff = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError;
};

module.exports = {
  sweepUpcomingAssignments,
  sweepUpcomingCalendarEvents,
  sweepApproachingAttendanceDeadlines,
  deduplicateNotifications,
  runUpcomingEventRemindersSweep,
  runUpcomingEventRemindersSweepWithRetry,
};
