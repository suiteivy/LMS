const supabase = require('../utils/supabaseClient.js');
const { sendBulkInAppNotificationsWithHistory } = require('./notificationDelivery.service.js');
const { isTransientSupabaseError } = require('../utils/supabaseRetry.js');

const REMINDER_OFFSETS_DAYS = [14, 7, 3, 1];

const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const isFeeStructureApplicableToStudent = (feeStructure, student) => {
  const scope = normalizeText(feeStructure?.level_scope) || 'all';
  const gradeLevel = Number(student?.grade_level);
  const formLevel = Number(student?.form_level);

  if (scope === 'all') return true;

  if (scope === 'grade') {
    const target = Number(feeStructure?.level_value);
    return Number.isFinite(target) && Number.isFinite(gradeLevel) && target === gradeLevel;
  }

  if (scope === 'form') {
    const target = Number(feeStructure?.level_value);
    return Number.isFinite(target) && Number.isFinite(formLevel) && target === formLevel;
  }

  if (scope === 'range') {
    const from = Number(feeStructure?.level_from);
    const to = Number(feeStructure?.level_to);
    const studentLevel = Number.isFinite(gradeLevel) ? gradeLevel : formLevel;
    return Number.isFinite(from) && Number.isFinite(to) && Number.isFinite(studentLevel) && studentLevel >= from && studentLevel <= to;
  }

  return true;
};

const startOfDay = (dateLike) => {
  const d = new Date(dateLike);
  d.setHours(0, 0, 0, 0);
  return d;
};

const toIsoDate = (dateLike) => {
  const d = new Date(dateLike);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const dayDiff = (fromDateLike, toDateLike) => {
  const from = startOfDay(fromDateLike).getTime();
  const to = startOfDay(toDateLike).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
};

const buildStudentLevelMap = async (institutionId, students) => {
  const studentLevelMap = new Map();
  const studentIds = (students || []).map((s) => s.id).filter(Boolean);
  if (studentIds.length === 0) return studentLevelMap;

  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('student_id, class_id')
    .eq('institution_id', institutionId)
    .in('student_id', studentIds);

  const classIds = Array.from(new Set((enrollments || []).map((row) => row.class_id).filter(Boolean)));
  let classMap = new Map();
  if (classIds.length > 0) {
    const { data: classes } = await supabase
      .from('classes')
      .select('id, grade_level, form_level')
      .in('id', classIds);
    classMap = new Map((classes || []).map((klass) => [klass.id, klass]));
  }

  for (const student of students || []) {
    const enroll = (enrollments || []).find((row) => row.student_id === student.id && row.class_id && classMap.has(row.class_id));
    const classLevel = enroll ? classMap.get(enroll.class_id) : null;
    studentLevelMap.set(student.id, {
      ...student,
      grade_level: Number.isFinite(Number(student?.grade_level)) ? student.grade_level : classLevel?.grade_level,
      form_level: Number.isFinite(Number(student?.form_level)) ? student.form_level : classLevel?.form_level,
    });
  }

  return studentLevelMap;
};

const runFeeDeadlineReminderSweep = async ({ now = new Date(), includeDeadlineDay = false } = {}) => {
  const todayStart = startOfDay(now);
  const todayStartIso = todayStart.toISOString();
  const todayIsoDate = toIsoDate(todayStart);
  if (!todayIsoDate) {
    return { processedStructures: 0, queuedNotifications: 0, delivered: 0, skipped: 0 };
  }

  const { data: feeStructures, error } = await supabase
    .from('fee_structures')
    .select('id, institution_id, title, amount, due_date, level_scope, level_value, level_from, level_to, is_active')
    .eq('is_active', true)
    .not('due_date', 'is', null);

  if (error) throw new Error(error.message);

  const offsets = includeDeadlineDay ? [...REMINDER_OFFSETS_DAYS, 0] : REMINDER_OFFSETS_DAYS;
  const dueSoon = (feeStructures || []).filter((fee) => offsets.includes(dayDiff(todayStart, fee.due_date)));

  if (dueSoon.length === 0) {
    return { processedStructures: 0, queuedNotifications: 0, delivered: 0, skipped: 0 };
  }

  const institutionIds = Array.from(new Set(dueSoon.map((row) => row.institution_id).filter(Boolean)));
  const pendingNotifications = [];
  let skipped = 0;

  for (const institutionId of institutionIds) {
    const institutionFeeStructures = dueSoon.filter((row) => row.institution_id === institutionId);
    if (institutionFeeStructures.length === 0) continue;

    const { data: students } = await supabase
      .from('students')
      .select('id, user_id, grade_level, form_level')
      .eq('institution_id', institutionId);

    const studentLevelMap = await buildStudentLevelMap(institutionId, students || []);
    const studentUserMap = new Map((students || []).filter((s) => s?.id && s?.user_id).map((s) => [s.id, s.user_id]));

    const studentIds = Array.from(studentUserMap.keys());
    let parentRows = [];
    let parentUserByParentId = new Map();

    if (studentIds.length > 0) {
      const { data: links } = await supabase
        .from('parent_students')
        .select('parent_id, student_id')
        .eq('institution_id', institutionId)
        .in('student_id', studentIds);
      parentRows = links || [];

      const parentIds = Array.from(new Set(parentRows.map((row) => row.parent_id).filter(Boolean)));
      if (parentIds.length > 0) {
        const { data: parents } = await supabase
          .from('parents')
          .select('id, user_id')
          .in('id', parentIds)
          .eq('institution_id', institutionId);
        parentUserByParentId = new Map((parents || []).filter((p) => p?.id && p?.user_id).map((p) => [p.id, p.user_id]));
      }
    }

    for (const fee of institutionFeeStructures) {
      const daysRemaining = dayDiff(todayStart, fee.due_date);
      const dueDateIso = toIsoDate(fee.due_date);
      const applicableStudentIds = Array.from(studentLevelMap.keys()).filter((studentId) => {
        const level = studentLevelMap.get(studentId);
        return isFeeStructureApplicableToStudent(fee, level);
      });

      if (applicableStudentIds.length === 0) {
        skipped += 1;
        continue;
      }

      const recipientUserIds = new Set();
      for (const studentId of applicableStudentIds) {
        const studentUserId = studentUserMap.get(studentId);
        if (studentUserId) recipientUserIds.add(studentUserId);

        for (const link of parentRows) {
          if (link.student_id !== studentId) continue;
          const parentUserId = parentUserByParentId.get(link.parent_id);
          if (parentUserId) recipientUserIds.add(parentUserId);
        }
      }

      const recipients = Array.from(recipientUserIds);
      if (recipients.length === 0) {
        skipped += 1;
        continue;
      }

      const reminderKey = `fee-deadline:${todayIsoDate}:${fee.id}:${daysRemaining}`;
      const { data: existingRows } = await supabase
        .from('notifications')
        .select('user_id')
        .in('user_id', recipients)
        .gte('created_at', todayStartIso)
        .contains('data', { reminder_key: reminderKey });
      const alreadyNotified = new Set((existingRows || []).map((row) => row.user_id).filter(Boolean));

      const timingText = daysRemaining === 0
        ? 'today'
        : daysRemaining === 1
          ? 'in 1 day'
          : daysRemaining >= 7 && daysRemaining % 7 === 0
            ? `in ${daysRemaining / 7} week${daysRemaining / 7 > 1 ? 's' : ''}`
            : `in ${daysRemaining} days`;

      const title = daysRemaining === 0
        ? 'Fee payment deadline is today'
        : 'Upcoming fee payment deadline';
      const message = `${fee.title || 'Fee structure'} is due ${timingText} (${dueDateIso}).`;

      for (const userId of recipients) {
        if (alreadyNotified.has(userId)) {
          skipped += 1;
          continue;
        }

        pendingNotifications.push({
          user_id: userId,
          institution_id: institutionId,
          title,
          message,
          type: 'info',
          data: {
            source: 'fee_deadline',
            reminder_key: reminderKey,
            fee_structure_id: fee.id,
            fee_structure_title: fee.title || null,
            due_date: dueDateIso,
            days_remaining: daysRemaining,
          },
        });
      }
    }
  }

  if (pendingNotifications.length === 0) {
    return {
      processedStructures: dueSoon.length,
      queuedNotifications: 0,
      delivered: 0,
      skipped,
    };
  }

  const result = await sendBulkInAppNotificationsWithHistory(pendingNotifications);
  const delivered = (result || []).filter((row) => row.ok && !row.skipped).length;

  return {
    processedStructures: dueSoon.length,
    queuedNotifications: pendingNotifications.length,
    delivered,
    skipped,
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runFeeDeadlineReminderSweepWithRetry = async ({ attempts = 3, baseDelayMs = 1200, ...options } = {}) => {
  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await runFeeDeadlineReminderSweep(options);
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

  throw lastError || new Error('Fee deadline reminder sweep failed after retries');
};

module.exports = {
  runFeeDeadlineReminderSweep,
  runFeeDeadlineReminderSweepWithRetry,
};
