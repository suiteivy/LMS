const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const buildPromotionDecisions = ({ enrollments, reportCards, cycleConfig }) => {
  const byStudentReport = new Map((reportCards || []).map((rc) => [rc.student_id, rc]));

  return (enrollments || []).map((enrollment) => {
    const report = byStudentReport.get(enrollment.student_id);
    const studentName =
      enrollment.students?.users?.full_name ||
      `${enrollment.students?.users?.first_name || ''} ${enrollment.students?.users?.last_name || ''}`.trim() ||
      enrollment.student_id;

    const average = toNumber(report?.average_percentage, 0);
    const attendancePct =
      toNumber(report?.total_school_days, 0) > 0
        ? (toNumber(report?.attendance_count, 0) / toNumber(report?.total_school_days, 1)) * 100
        : null;

    let eligible = true;
    let reason = 'Eligible';

    if (!report) {
      eligible = false;
      reason = 'Missing report card for selected term';
    } else if (!['published', 'released'].includes(report.status)) {
      eligible = false;
      reason = `Report card status must be published/released (found: ${report.status || 'unknown'})`;
    } else if (average < cycleConfig.min_average_percentage) {
      eligible = false;
      reason = `Average ${average.toFixed(1)} below minimum ${cycleConfig.min_average_percentage}`;
    } else if (
      cycleConfig.min_attendance_percentage > 0 &&
      attendancePct !== null &&
      attendancePct < cycleConfig.min_attendance_percentage
    ) {
      eligible = false;
      reason = `Attendance ${attendancePct.toFixed(1)}% below minimum ${cycleConfig.min_attendance_percentage}%`;
    }

    return {
      student_id: enrollment.student_id,
      student_name: studentName,
      report_card_id: report?.id || null,
      average_percentage: report ? average : null,
      attendance_percentage: attendancePct,
      eligible,
      reason,
      status: eligible ? 'pending' : 'retained',
    };
  });
};

module.exports = {
  buildPromotionDecisions,
  toNumber,
};
