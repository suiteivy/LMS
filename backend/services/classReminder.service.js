const supabase = require("../utils/supabaseClient.js");
const { buildClassLabel } = require("../utils/classLabel.js");
const { sendBulkInAppNotificationsWithHistory } = require("./notificationDelivery.service.js");
const { isTransientSupabaseError } = require('../utils/supabaseRetry.js');

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") return NaN;
  const [h, m] = timeValue.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
};

const toTimeLabel = (timeValue) => {
  if (!timeValue || typeof timeValue !== "string") return "";
  const [hh, mm] = timeValue.split(":");
  return `${hh || "00"}:${mm || "00"}`;
};

const startOfDayIso = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const resolveTeacherUserIdsBySubject = (timetableRows, subjectTeacherRows, teacherUserMap) => {
  const map = new Map();

  for (const row of timetableRows) {
    if (!row?.subject_id) continue;
    const subjectId = row.subject_id;
    const teacherSet = map.get(subjectId) || new Set();

    const primaryTeacherId = row?.subjects?.teacher_id;
    if (primaryTeacherId && teacherUserMap.has(primaryTeacherId)) {
      teacherSet.add(teacherUserMap.get(primaryTeacherId));
    }

    map.set(subjectId, teacherSet);
  }

  for (const row of subjectTeacherRows || []) {
    if (!row?.subject_id || !row?.teacher_id) continue;
    const teacherUserId = teacherUserMap.get(row.teacher_id);
    if (!teacherUserId) continue;
    const teacherSet = map.get(row.subject_id) || new Set();
    teacherSet.add(teacherUserId);
    map.set(row.subject_id, teacherSet);
  }

  return map;
};

const runUpcomingClassReminderSweep = async ({ now = new Date(), leadMinutes = 10, windowMinutes = 5 } = {}) => {
  const weekday = WEEKDAYS[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const windowStart = nowMinutes + leadMinutes;
  const windowEnd = windowStart + windowMinutes;

  const { data: rows, error } = await supabase
    .from("timetables")
    .select(
      "id, institution_id, class_id, subject_id, day_of_week, start_time, end_time, room_number, classes(id, grade_level, form_level, stream, class_type), subjects(title, teacher_id)"
    )
    .eq("day_of_week", weekday);

  if (error) throw new Error(error.message);

  const upcomingRows = (rows || []).filter((row) => {
    const startMin = toMinutes(row.start_time);
    return Number.isFinite(startMin) && startMin >= windowStart && startMin < windowEnd;
  });

  if (upcomingRows.length === 0) {
    return { processedClasses: 0, queuedNotifications: 0, delivered: 0, skipped: 0 };
  }

  const classIds = Array.from(new Set(upcomingRows.map((r) => r.class_id).filter(Boolean)));
  const subjectIds = Array.from(new Set(upcomingRows.map((r) => r.subject_id).filter(Boolean)));

  const [{ data: enrollments }, { data: subjectTeachers }] = await Promise.all([
    supabase
      .from("class_enrollments")
      .select("class_id, student_id")
      .in("class_id", classIds)
      .eq("status", "enrolled"),
    supabase
      .from("subject_teachers")
      .select("subject_id, teacher_id")
      .in("subject_id", subjectIds),
  ]);

  const studentIds = Array.from(new Set((enrollments || []).map((r) => r.student_id).filter(Boolean)));
  const teacherIds = Array.from(
    new Set([
      ...upcomingRows.map((r) => r?.subjects?.teacher_id).filter(Boolean),
      ...(subjectTeachers || []).map((r) => r.teacher_id).filter(Boolean),
    ])
  );

  const [{ data: studentRows }, { data: teacherRows }] = await Promise.all([
    studentIds.length
      ? supabase.from("students").select("id, user_id").in("id", studentIds)
      : Promise.resolve({ data: [] }),
    teacherIds.length
      ? supabase.from("teachers").select("id, user_id").in("id", teacherIds)
      : Promise.resolve({ data: [] }),
  ]);

  const studentUserMap = new Map((studentRows || []).filter((r) => r?.id && r?.user_id).map((r) => [r.id, r.user_id]));
  const teacherUserMap = new Map((teacherRows || []).filter((r) => r?.id && r?.user_id).map((r) => [r.id, r.user_id]));

  const teacherUserIdsBySubject = resolveTeacherUserIdsBySubject(upcomingRows, subjectTeachers || [], teacherUserMap);

  const studentUserIdsByClass = new Map();
  for (const row of enrollments || []) {
    if (!row?.class_id || !row?.student_id) continue;
    const studentUserId = studentUserMap.get(row.student_id);
    if (!studentUserId) continue;
    const set = studentUserIdsByClass.get(row.class_id) || new Set();
    set.add(studentUserId);
    studentUserIdsByClass.set(row.class_id, set);
  }

  const currentDate = now.toISOString().slice(0, 10);
  const todayStartIso = startOfDayIso(now);

  const pendingNotifications = [];
  let skipped = 0;

  for (const row of upcomingRows) {
    const reminderKey = `class-reminder:${currentDate}:${row.id}:${toTimeLabel(row.start_time)}`;
    const teacherRecipients = teacherUserIdsBySubject.get(row.subject_id) || new Set();
    const studentRecipients = studentUserIdsByClass.get(row.class_id) || new Set();
    const recipientUserIds = Array.from(new Set([...teacherRecipients, ...studentRecipients].filter(Boolean)));

    if (recipientUserIds.length === 0) {
      skipped += 1;
      continue;
    }

    const { data: existingRows } = await supabase
      .from("notifications")
      .select("user_id")
      .in("user_id", recipientUserIds)
      .gte("created_at", todayStartIso)
      .contains("data", { reminder_key: reminderKey });

    const alreadyNotified = new Set((existingRows || []).map((r) => r.user_id).filter(Boolean));

    const classLabel = buildClassLabel(row.classes || {}) || "your class";
    const subjectTitle = row?.subjects?.title || "Upcoming class";
    const startLabel = toTimeLabel(row.start_time);
    const roomInfo = row?.room_number ? ` in ${row.room_number}` : "";

    for (const userId of recipientUserIds) {
      if (alreadyNotified.has(userId)) {
        skipped += 1;
        continue;
      }

      pendingNotifications.push({
        user_id: userId,
        institution_id: row.institution_id,
        title: "Class starts in 10 minutes",
        message: `${subjectTitle} (${classLabel}) starts at ${startLabel}${roomInfo}.`,
        type: "info",
        data: {
          source: "class_reminder",
          reminder_key: reminderKey,
          class_id: row.class_id,
          subject_id: row.subject_id,
          timetable_id: row.id,
          start_time: row.start_time,
          day_of_week: row.day_of_week,
        },
      });
    }
  }

  if (pendingNotifications.length === 0) {
    return {
      processedClasses: upcomingRows.length,
      queuedNotifications: 0,
      delivered: 0,
      skipped,
    };
  }

  const result = await sendBulkInAppNotificationsWithHistory(pendingNotifications);
  const delivered = (result || []).filter((r) => r.ok && !r.skipped).length;

  return {
    processedClasses: upcomingRows.length,
    queuedNotifications: pendingNotifications.length,
    delivered,
    skipped,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runUpcomingClassReminderSweepWithRetry = async ({
  attempts = 3,
  baseDelayMs = 1000,
  ...options
} = {}) => {
  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await runUpcomingClassReminderSweep(options);
    } catch (error) {
      lastError = error;
      const isTransient = isTransientSupabaseError(error);
      if (!isTransient || i === attempts - 1) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 250);
      const backoff = (baseDelayMs * (2 ** i)) + jitter;
      await sleep(backoff);
    }
  }

  throw lastError || new Error('Class reminder sweep failed after retries');
};

module.exports = {
  runUpcomingClassReminderSweep,
  runUpcomingClassReminderSweepWithRetry,
};
