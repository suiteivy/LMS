const supabase = require('../utils/supabaseClient.js');
const pdfCompilerService = require('../services/pdfCompiler.service');

const MasterRecordController = {
  /**
   * Get unified Master Record for a user
   * GET /api/users/:id/master-record
   */
  async getMasterRecord(req, res) {
    try {
      const { id } = req.params;
      const targetUserId = id;
      const requester = req.user;
      const institutionId = requester.institution_id;

      // 1. Fetch target user
      let { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id, institution_id, first_name, last_name, full_name, email, role, avatar_url, phone, gender, date_of_birth, address, is_active, created_at')
        .eq('id', targetUserId)
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (!targetUser) {
        // Fallback: check if targetUserId was a student.id
        const { data: studRec } = await supabase
          .from('students')
          .select('user_id')
          .eq('id', targetUserId)
          .maybeSingle();
        if (studRec?.user_id) {
          const { data: fallbackUser } = await supabase
            .from('users')
            .select('id, institution_id, first_name, last_name, full_name, email, role, avatar_url, phone, gender, date_of_birth, address, is_active, created_at')
            .eq('id', studRec.user_id)
            .eq('institution_id', institutionId)
            .maybeSingle();
          targetUser = fallbackUser;
        }
      }

      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User record not found.' });
      }

      // Determine Access Level & Permissions
      let accessLevel = 'restricted';
      const isSelf = requester.id === targetUser.id;
      const isAdmin = requester.role === 'admin' || requester.role === 'master_admin';

      let isClassTeacher = false;
      let isSubjectTeacher = false;
      let targetStudent = null;
      let targetTeacher = null;

      if (isAdmin) {
        accessLevel = 'admin';
      } else if (isSelf) {
        accessLevel = 'self';
      } else if (requester.role === 'teacher' && targetUser.role === 'student') {
        // Fetch target student profile
        const { data: stud } = await supabase
          .from('students')
          .select('id, user_id, class_id, admission_number, enrollment_status')
          .eq('user_id', targetUser.id)
          .maybeSingle();

        targetStudent = stud;

        if (targetStudent) {
          // Check if requester is class teacher of this student's class
          const { data: classRec } = await supabase
            .from('classes')
            .select('id, class_teacher_id')
            .eq('id', targetStudent.class_id)
            .maybeSingle();

          // Check teacher id
          const { data: teacherRec } = await supabase
            .from('teachers')
            .select('id')
            .eq('user_id', requester.id)
            .maybeSingle();

          if (classRec && teacherRec && (classRec.class_teacher_id === teacherRec.id || classRec.class_teacher_id === requester.id)) {
            isClassTeacher = true;
            accessLevel = 'class_teacher';
          } else {
            isSubjectTeacher = true;
            accessLevel = 'subject_teacher';
          }
        }
      } else if (requester.role === 'parent' && targetUser.role === 'student') {
        // Verify parent link
        const { data: stud } = await supabase
          .from('students')
          .select('id')
          .eq('user_id', targetUser.id)
          .maybeSingle();

        if (stud) {
          const { data: link } = await supabase
            .from('parent_student_links')
            .select('id')
            .eq('parent_id', requester.id)
            .eq('student_id', stud.id)
            .maybeSingle();

          if (link) {
            accessLevel = 'parent';
          }
        }
      }

      if (accessLevel === 'restricted') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You do not have permission to view this master record.',
        });
      }

      // 2. Fetch specific role-based data
      let academicData = null;
      let attendanceData = null;
      let violationsData = [];
      let clearanceData = [];
      let financeData = null;
      let guardiansData = [];

      if (targetUser.role === 'student') {
        // Student details
        if (!targetStudent) {
          const { data: s } = await supabase
            .from('students')
            .select('*, classes(id, name, grade_level, form_level, is_final_level)')
            .eq('user_id', targetUser.id)
            .maybeSingle();
          targetStudent = s;
        } else if (!targetStudent.classes) {
          const { data: c } = await supabase
            .from('classes')
            .select('id, name, grade_level, form_level, is_final_level')
            .eq('id', targetStudent.class_id)
            .maybeSingle();
          targetStudent.classes = c;
        }

        if (targetStudent) {
          academicData = {
            student_id: targetStudent.id,
            admission_number: targetStudent.admission_number,
            enrollment_status: targetStudent.enrollment_status || 'active',
            current_class: targetStudent.classes,
          };

          // Attendance summary
          const { data: attList } = await supabase
            .from('attendance')
            .select('status, date, subject_id, subjects(title)')
            .eq('student_id', targetStudent.id)
            .order('date', { ascending: false });

          const total = attList?.length || 0;
          const presentCount = attList?.filter((a) => a.status === 'present').length || 0;
          const lateCount = attList?.filter((a) => a.status === 'late').length || 0;
          const absentCount = attList?.filter((a) => a.status === 'absent').length || 0;
          const attendanceRate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 100;

          attendanceData = {
            total_records: total,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            attendance_rate: `${attendanceRate}%`,
            recent_logs: (attList || []).slice(0, 10),
          };

          // Disciplinary Violations (visible to Admin, Class Teacher, Parent, and Student)
          if (accessLevel !== 'subject_teacher') {
            const { data: viols } = await supabase
              .from('student_violations')
              .select(`
                *,
                recorded_by_user:users!student_violations_recorded_by_fkey(full_name, email, role),
                resolved_by_user:users!student_violations_resolved_by_fkey(full_name, email, role)
              `)
              .eq('student_id', targetStudent.id)
              .order('created_at', { ascending: false });

            violationsData = viols || [];
          }

          // Finance Data (scoped: Admin, Class Teacher, Parent, and Student)
          if (accessLevel !== 'subject_teacher') {
            financeData = {
              fee_balance: targetStudent.fee_balance || 0,
            };
          }

          // Guardians (scoped: Admin, Class Teacher, Parent)
          if (accessLevel === 'admin' || accessLevel === 'class_teacher') {
            const { data: gList } = await supabase
              .from('parent_student_links')
              .select('id, relationship, parent:users!parent_student_links_parent_id_fkey(id, full_name, email, phone)')
              .eq('student_id', targetStudent.id);

            guardiansData = gList || [];
          }
        }
      } else if (targetUser.role === 'teacher') {
        const { data: tRec } = await supabase
          .from('teachers')
          .select('*, classes!classes_class_teacher_id_fkey(id, name, grade_level)')
          .eq('user_id', targetUser.id)
          .maybeSingle();

        targetTeacher = tRec;

        // Fetch subjects assigned to teacher
        let teacherSubjects = [];
        if (targetTeacher) {
          const { data: subjs } = await supabase
            .from('subjects')
            .select('id, title, code, class:classes(id, name)')
            .eq('teacher_id', targetTeacher.id);

          teacherSubjects = subjs || [];
        }

        academicData = {
          teacher_id: targetTeacher?.id,
          specialization: targetTeacher?.specialization,
          assigned_class: targetTeacher?.classes,
          subjects_taught: teacherSubjects,
        };
      }

      // Clearance Records (for student or staff departure)
      if (accessLevel !== 'subject_teacher') {
        const { data: clearances } = await supabase
          .from('clearance_processes')
          .select(`
            *,
            initiator:users!clearance_processes_initiator_user_id_fkey(full_name, email, role),
            completer:users!clearance_processes_completed_by_fkey(full_name, email)
          `)
          .eq('user_id', targetUser.id)
          .order('created_at', { ascending: false });

        clearanceData = clearances || [];
      }

      return res.json({
        success: true,
        data: {
          user: targetUser,
          access_level: accessLevel,
          academic: academicData,
          attendance: attendanceData,
          disciplinary: violationsData,
          clearance: clearanceData,
          finance: financeData,
          guardians: guardiansData,
        },
      });
    } catch (err) {
      console.error('Error in getMasterRecord:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * Generate Institutional Summary PDF
   * GET /api/users/:id/institutional-summary-pdf
   */
  async getInstitutionalSummaryPdf(req, res) {
    try {
      const { id } = req.params;
      const requester = req.user;
      const institutionId = requester.institution_id;

      // Fetch user & institution
      let [userRes, instRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email, role, created_at, phone')
          .eq('id', id)
          .eq('institution_id', institutionId)
          .maybeSingle(),
        supabase
          .from('institutions')
          .select('name, address, email, phone')
          .eq('id', institutionId)
          .single(),
      ]);

      let targetUser = userRes.data;
      if (!targetUser) {
        // Fallback: check if id is a student id
        const { data: studRec } = await supabase
          .from('students')
          .select('user_id')
          .eq('id', id)
          .maybeSingle();
        if (studRec?.user_id) {
          const { data: fallbackUser } = await supabase
            .from('users')
            .select('id, full_name, email, role, created_at, phone')
            .eq('id', studRec.user_id)
            .eq('institution_id', institutionId)
            .maybeSingle();
          targetUser = fallbackUser;
        }
      }

      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User record not found.' });
      }

      const inst = instRes.data;

      let studentDetails = null;
      let violationsCount = 0;
      let clearanceStatus = 'None';

      if (targetUser.role === 'student') {
        const { data: s } = await supabase
          .from('students')
          .select('id, admission_number, enrollment_status, classes(name, grade_level)')
          .eq('user_id', targetUser.id)
          .maybeSingle();

        studentDetails = s;

        if (s) {
          const { count } = await supabase
            .from('student_violations')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', s.id);
          violationsCount = count || 0;
        }
      }

      const { data: clr } = await supabase
        .from('clearance_processes')
        .select('status, reason_category, completed_at')
        .eq('user_id', targetUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (clr) {
        clearanceStatus = `${clr.status.toUpperCase()} (${clr.reason_category})`;
      }

      const pdfData = {
        institution_name: inst?.name || 'Academic Institution',
        institution_address: inst?.address || '',
        institution_contact: inst?.email || inst?.phone || '',
        user_id: targetUser.id,
        full_name: targetUser.full_name,
        email: targetUser.email,
        role: targetUser.role.toUpperCase(),
        phone: targetUser.phone || 'N/A',
        enrollment_date: new Date(targetUser.created_at).toLocaleDateString(),
        admission_number: studentDetails?.admission_number || 'N/A',
        class_name: studentDetails?.classes?.name || 'N/A',
        enrollment_status: studentDetails?.enrollment_status || (targetUser.role === 'student' ? 'Active' : 'Active Faculty'),
        violations_count: violationsCount,
        clearance_status: clearanceStatus,
        date_generated: new Date().toLocaleDateString(),
      };

      const pdfBuffer = await pdfCompilerService.compile('institutional_summary', pdfData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="institutional-summary-${targetUser.id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('Error generating institutional summary PDF:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};

module.exports = MasterRecordController;
