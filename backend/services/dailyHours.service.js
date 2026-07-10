const supabase = require('../utils/supabaseClient.js');

const PERSON_TYPE = {
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string') return null;
  const [h, m] = timeValue.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h * 60) + m;
};

const durationMinutes = (startTime, endTime) => {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(end - start, 0);
};

const dayNameFromDate = (dateStr) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(d.getTime())) return null;
  return DAY_NAMES[d.getDay()] || null;
};

const isoDateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const upsertDailyHoursLog = async ({ institution_id, person_id, person_type, date, total_minutes }) => {
  const payload = {
    institution_id,
    person_id,
    person_type,
    date,
    total_minutes,
    computed_at: new Date().toISOString(),
    is_deleted: false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('daily_hours_logs')
    .upsert(payload, { onConflict: 'institution_id,person_id,person_type,date' })
    .select('id')
    .single();

  if (error) throw error;
  return data?.id;
};

const replaceContributions = async (daily_hours_log_id, contributions) => {
  const { error: deleteError } = await supabase
    .from('daily_hours_contributions')
    .delete()
    .eq('daily_hours_log_id', daily_hours_log_id);
  if (deleteError) throw deleteError;

  if (!contributions || contributions.length === 0) return;

  const rows = contributions.map((c) => ({
    daily_hours_log_id,
    timetable_entry_id: c.timetable_entry_id,
    minutes: c.minutes,
  }));

  const { error: insertError } = await supabase
    .from('daily_hours_contributions')
    .insert(rows);
  if (insertError) throw insertError;
};

const getTeacherAttendanceMap = async (institution_id, date) => {
  const { data, error } = await supabase
    .from('teacher_attendance')
    .select('teacher_id, status')
    .eq('institution_id', institution_id)
    .eq('date', date);

  if (error) throw error;
  const map = new Map();
  (data || []).forEach((row) => {
    if (row.teacher_id) map.set(row.teacher_id, row.status || null);
  });
  return map;
};

const getStudentAttendanceMap = async (institution_id, date) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('institution_id', institution_id)
    .eq('date', date);

  if (error) throw error;
  const map = new Map();
  (data || []).forEach((row) => {
    if (!row.student_id) return;
    if (!map.has(row.student_id)) map.set(row.student_id, []);
    map.get(row.student_id).push(row.status || null);
  });
  return map;
};

const isPresentStatus = (status) => status === 'present' || status === 'late';

const shouldCountTeacherByDayAttendance = (status) => isPresentStatus(status);

const shouldCountStudentByAttendanceRows = (statuses) => {
  if (!Array.isArray(statuses) || statuses.length === 0) return false;
  return statuses.some(isPresentStatus);
};

const getTeacherTimetableForDay = async (institution_id, dayName) => {
  const { data, error } = await supabase
    .from('timetables')
    .select('id, subject_id, start_time, end_time')
    .eq('institution_id', institution_id)
    .eq('day_of_week', dayName);
  if (error) throw error;

  const subjectIds = [...new Set((data || []).map((r) => r.subject_id).filter(Boolean))];
  if (subjectIds.length === 0) return { entriesByTeacher: new Map(), allEntries: [] };

  const [{ data: primaryRows, error: primaryErr }, { data: assocRows, error: assocErr }] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, teacher_id')
      .in('id', subjectIds)
      .eq('institution_id', institution_id),
    supabase
      .from('subject_teachers')
      .select('subject_id, teacher_id')
      .in('subject_id', subjectIds)
      .eq('institution_id', institution_id),
  ]);

  if (primaryErr) throw primaryErr;
  if (assocErr && assocErr.code !== '42P01') throw assocErr;

  const teachersBySubject = new Map();
  (primaryRows || []).forEach((row) => {
    if (!row?.id) return;
    if (!teachersBySubject.has(row.id)) teachersBySubject.set(row.id, new Set());
    if (row.teacher_id) teachersBySubject.get(row.id).add(row.teacher_id);
  });
  (assocRows || []).forEach((row) => {
    if (!row?.subject_id) return;
    if (!teachersBySubject.has(row.subject_id)) teachersBySubject.set(row.subject_id, new Set());
    if (row.teacher_id) teachersBySubject.get(row.subject_id).add(row.teacher_id);
  });

  const entriesByTeacher = new Map();
  (data || []).forEach((entry) => {
    const minutes = durationMinutes(entry.start_time, entry.end_time);
    if (minutes <= 0) return;
    const teachers = [...(teachersBySubject.get(entry.subject_id) || new Set())];
    teachers.forEach((teacherId) => {
      if (!entriesByTeacher.has(teacherId)) entriesByTeacher.set(teacherId, []);
      entriesByTeacher.get(teacherId).push({ timetable_entry_id: entry.id, minutes });
    });
  });

  return { entriesByTeacher, allEntries: data || [] };
};

const getStudentTimetableForDay = async (institution_id, dayName) => {
  const { data, error } = await supabase
    .from('timetables')
    .select('id, class_id, start_time, end_time')
    .eq('institution_id', institution_id)
    .eq('day_of_week', dayName);
  if (error) throw error;

  const classIds = [...new Set((data || []).map((r) => r.class_id).filter(Boolean))];
  if (classIds.length === 0) return new Map();

  const { data: enrollments, error: enrollErr } = await supabase
    .from('class_enrollments')
    .select('student_id, class_id')
    .eq('institution_id', institution_id)
    .in('class_id', classIds);
  if (enrollErr) throw enrollErr;

  const studentsByClass = new Map();
  (enrollments || []).forEach((row) => {
    if (!row?.class_id || !row?.student_id) return;
    if (!studentsByClass.has(row.class_id)) studentsByClass.set(row.class_id, new Set());
    studentsByClass.get(row.class_id).add(row.student_id);
  });

  const entriesByStudent = new Map();
  (data || []).forEach((entry) => {
    const minutes = durationMinutes(entry.start_time, entry.end_time);
    if (minutes <= 0) return;
    const students = [...(studentsByClass.get(entry.class_id) || new Set())];
    students.forEach((studentId) => {
      if (!entriesByStudent.has(studentId)) entriesByStudent.set(studentId, []);
      entriesByStudent.get(studentId).push({ timetable_entry_id: entry.id, minutes });
    });
  });

  return entriesByStudent;
};

const recomputeDailyTeacherHours = async ({ institution_id, date, teacher_ids = null }) => {
  const dayName = dayNameFromDate(date);
  if (!dayName) return { processed: 0 };

  const [attendanceMap, timetable] = await Promise.all([
    getTeacherAttendanceMap(institution_id, date),
    getTeacherTimetableForDay(institution_id, dayName),
  ]);

  const teacherIdSet = new Set([
    ...attendanceMap.keys(),
    ...timetable.entriesByTeacher.keys(),
    ...((teacher_ids || []).filter(Boolean)),
  ]);

  let processed = 0;
  for (const teacherId of teacherIdSet) {
    const status = attendanceMap.get(teacherId);
    const entries = timetable.entriesByTeacher.get(teacherId) || [];
    const shouldCount = shouldCountTeacherByDayAttendance(status);
    const contributions = shouldCount ? entries : [];
    const total_minutes = contributions.reduce((sum, c) => sum + c.minutes, 0);

    const logId = await upsertDailyHoursLog({
      institution_id,
      person_id: teacherId,
      person_type: PERSON_TYPE.TEACHER,
      date,
      total_minutes,
    });
    await replaceContributions(logId, contributions);
    processed += 1;
  }

  return { processed };
};

const recomputeDailyStudentHours = async ({ institution_id, date, student_ids = null }) => {
  const dayName = dayNameFromDate(date);
  if (!dayName) return { processed: 0 };

  const [attendanceMap, timetableEntriesByStudent] = await Promise.all([
    getStudentAttendanceMap(institution_id, date),
    getStudentTimetableForDay(institution_id, dayName),
  ]);

  const studentIdSet = new Set([
    ...attendanceMap.keys(),
    ...timetableEntriesByStudent.keys(),
    ...((student_ids || []).filter(Boolean)),
  ]);

  let processed = 0;
  for (const studentId of studentIdSet) {
    const statuses = attendanceMap.get(studentId) || [];
    const entries = timetableEntriesByStudent.get(studentId) || [];
    const shouldCount = shouldCountStudentByAttendanceRows(statuses);
    const contributions = shouldCount ? entries : [];
    const total_minutes = contributions.reduce((sum, c) => sum + c.minutes, 0);

    const logId = await upsertDailyHoursLog({
      institution_id,
      person_id: studentId,
      person_type: PERSON_TYPE.STUDENT,
      date,
      total_minutes,
    });
    await replaceContributions(logId, contributions);
    processed += 1;
  }

  return { processed };
};

const recomputeDailyHoursForInstitutionDate = async ({ institution_id, date, teacher_ids = null, student_ids = null }) => {
  const [teacherResult, studentResult] = await Promise.all([
    recomputeDailyTeacherHours({ institution_id, date, teacher_ids }),
    recomputeDailyStudentHours({ institution_id, date, student_ids }),
  ]);

  return {
    institution_id,
    date,
    teachers_processed: teacherResult.processed,
    students_processed: studentResult.processed,
  };
};

const listInstitutionDatesMatchingDayName = async ({ institution_id, day_name, lookback_days = 365 }) => {
  const fromDate = isoDateOffset(-Math.abs(Number(lookback_days) || 365));

  const [{ data: attendanceDates, error: attendanceErr }, { data: teacherDates, error: teacherErr }] = await Promise.all([
    supabase
      .from('attendance')
      .select('date')
      .eq('institution_id', institution_id)
      .gte('date', fromDate),
    supabase
      .from('teacher_attendance')
      .select('date')
      .eq('institution_id', institution_id)
      .gte('date', fromDate),
  ]);

  if (attendanceErr) throw attendanceErr;
  if (teacherErr) throw teacherErr;

  const unique = new Set();
  [...(attendanceDates || []), ...(teacherDates || [])].forEach((row) => {
    if (!row?.date) return;
    if (dayNameFromDate(row.date) === day_name) unique.add(row.date);
  });

  return [...unique].sort();
};

const recomputeForTimetableDayMutation = async ({ institution_id, day_name }) => {
  if (!day_name) return { processed_dates: 0 };
  const dates = await listInstitutionDatesMatchingDayName({ institution_id, day_name });
  for (const date of dates) {
    await recomputeDailyHoursForInstitutionDate({ institution_id, date });
  }
  return { processed_dates: dates.length };
};

const recomputePreviousDayForInstitutionsFromAttendance = async () => {
  const date = isoDateOffset(-1);

  const [{ data: studentRows, error: studentErr }, { data: teacherRows, error: teacherErr }] = await Promise.all([
    supabase
      .from('attendance')
      .select('institution_id')
      .eq('date', date),
    supabase
      .from('teacher_attendance')
      .select('institution_id')
      .eq('date', date),
  ]);

  if (studentErr) throw studentErr;
  if (teacherErr) throw teacherErr;

  const institutionIds = new Set();
  (studentRows || []).forEach((row) => {
    if (row?.institution_id) institutionIds.add(row.institution_id);
  });
  (teacherRows || []).forEach((row) => {
    if (row?.institution_id) institutionIds.add(row.institution_id);
  });

  let processedInstitutions = 0;
  for (const institution_id of institutionIds) {
    await recomputeDailyHoursForInstitutionDate({ institution_id, date });
    processedInstitutions += 1;
  }

  return {
    date,
    institutions_processed: processedInstitutions,
  };
};

const getHoursRollup = async ({ institution_id, person_id, person_type, start_date, end_date }) => {
  let query = supabase
    .from('daily_hours_logs')
    .select('date, total_minutes')
    .eq('institution_id', institution_id)
    .eq('person_id', person_id)
    .eq('person_type', person_type)
    .eq('is_deleted', false)
    .order('date', { ascending: true });

  if (start_date) query = query.gte('date', start_date);
  if (end_date) query = query.lte('date', end_date);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const total_minutes = rows.reduce((sum, row) => sum + Number(row.total_minutes || 0), 0);

  return {
    total_minutes,
    total_hours: Math.floor(total_minutes / 60),
    remaining_minutes: total_minutes % 60,
    days_count: rows.length,
    daily: rows,
  };
};

module.exports = {
  PERSON_TYPE,
  recomputeDailyHoursForInstitutionDate,
  recomputeDailyTeacherHours,
  recomputeDailyStudentHours,
  recomputeForTimetableDayMutation,
  recomputePreviousDayForInstitutionsFromAttendance,
  getHoursRollup,
};
