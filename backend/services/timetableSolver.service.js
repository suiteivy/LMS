const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Determine candidate Python paths.
 */
function getPythonExecutable() {
  if (process.env.PYTHON_PATH && fs.existsSync(process.env.PYTHON_PATH)) {
    return process.env.PYTHON_PATH;
  }
  const defaultPenv = 'C:\\Users\\USER\\.platformio\\penv\\Scripts\\python.exe';
  if (fs.existsSync(defaultPenv)) {
    return defaultPenv;
  }
  return 'python';
}

/**
 * Executes the PuLP MILP Python solver as a child process.
 */
async function runPythonSolver(data) {
  return new Promise((resolve, reject) => {
    const pythonExe = getPythonExecutable();
    const scriptPath = path.resolve(__dirname, '../solvers/timetable_solver.py');

    const proc = spawn(pythonExe, [scriptPath], {
      windowsHide: true,
      env: { ...process.env }
    });

    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn Python solver: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0 && !stdoutData.trim()) {
        return reject(new Error(`Python solver exited with code ${code}. Error: ${stderrData}`));
      }
      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Invalid JSON output from Python solver: ${err.message}. Raw: ${stdoutData}`));
      }
    });

    proc.stdin.write(JSON.stringify(data));
    proc.stdin.end();
  });
}

/**
 * Pure JavaScript CSP Backtracking Solver with MRV (Minimum Remaining Values) heuristic
 * for robust fallback in environments without Python/PuLP.
 */
function runJsFallbackSolver(data) {
  const days = data.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const teachingPeriods = (data.periods || [])
    .filter(p => !p.is_break)
    .sort((a, b) => a.period_number - b.period_number);

  if (teachingPeriods.length === 0) {
    return { success: false, error: 'No teaching periods defined in schedule configuration.' };
  }

  const classesMap = new Map((data.classes || []).map(c => [c.id, c]));
  const teachersMap = new Map((data.teachers || []).map(t => [t.id, t]));
  const periodInfoMap = new Map(teachingPeriods.map(p => [p.period_number, p]));

  // Teacher unavailability lookup: key = `${teacherId}|${day}|${periodNumber}`
  const unavailSet = new Set(
    (data.teacher_unavailability || []).map(u => `${u.teacher_id}|${u.day_of_week}|${u.period_number}`)
  );

  // Collect discrete lessons to schedule
  const itemsToSchedule = [];
  let itemIdCounter = 1;

  // 1. Standard subjects
  for (const req of (data.subject_requirements || [])) {
    const count = req.periods_per_week || 0;
    for (let i = 0; i < count; i++) {
      itemsToSchedule.push({
        id: itemIdCounter++,
        type: 'standard',
        class_id: req.class_id,
        subject_id: req.subject_id,
        subject_name: req.subject_name,
        eligible_teachers: req.eligible_teachers || [],
        allow_double: req.allow_double !== false,
        max_per_day: req.max_per_day || (count >= 4 ? 2 : 1)
      });
    }
  }

  // 2. Senior Secondary elective clusters
  for (const cluster of (data.senior_secondary_tracks || [])) {
    const count = cluster.periods_per_week || 0;
    for (let i = 0; i < count; i++) {
      itemsToSchedule.push({
        id: itemIdCounter++,
        type: 'cluster',
        cluster_id: cluster.slot_id,
        classes: cluster.classes || [],
        options: cluster.options || []
      });
    }
  }

  // Tracking grid:
  // classOccupied: Map(classId -> Set(day|period))
  // teacherOccupied: Map(teacherId -> Set(day|period))
  // classDaySubjectCount: Map(classId|day|subjectId -> number)
  const classOccupied = new Map();
  const teacherOccupied = new Map();
  const classDaySubjectCount = new Map();

  function isClassFree(classId, day, pNum) {
    const set = classOccupied.get(classId);
    return !set || !set.has(`${day}|${pNum}`);
  }

  function isTeacherFree(teacherId, day, pNum) {
    if (unavailSet.has(`${teacherId}|${day}|${pNum}`)) return false;
    const set = teacherOccupied.get(teacherId);
    return !set || !set.has(`${day}|${pNum}`);
  }

  function occupy(classId, teacherId, day, pNum, subjectId) {
    if (classId) {
      if (!classOccupied.has(classId)) classOccupied.set(classId, new Set());
      classOccupied.get(classId).add(`${day}|${pNum}`);
    }
    if (teacherId) {
      if (!teacherOccupied.has(teacherId)) teacherOccupied.set(teacherId, new Set());
      teacherOccupied.get(teacherId).add(`${day}|${pNum}`);
    }
    if (classId && subjectId) {
      const key = `${classId}|${day}|${subjectId}`;
      classDaySubjectCount.set(key, (classDaySubjectCount.get(key) || 0) + 1);
    }
  }

  function release(classId, teacherId, day, pNum, subjectId) {
    if (classId && classOccupied.has(classId)) {
      classOccupied.get(classId).delete(`${day}|${pNum}`);
    }
    if (teacherId && teacherOccupied.has(teacherId)) {
      teacherOccupied.get(teacherId).delete(`${day}|${pNum}`);
    }
    if (classId && subjectId) {
      const key = `${classId}|${day}|${subjectId}`;
      const curr = classDaySubjectCount.get(key) || 0;
      if (curr <= 1) classDaySubjectCount.delete(key);
      else classDaySubjectCount.set(key, curr - 1);
    }
  }

  // Pre-sort items: Clusters and items with fewest eligible teachers first (MRV heuristic)
  itemsToSchedule.sort((a, b) => {
    if (a.type === 'cluster' && b.type !== 'cluster') return -1;
    if (b.type === 'cluster' && a.type !== 'cluster') return 1;
    const aLen = a.eligible_teachers ? a.eligible_teachers.length : 1;
    const bLen = b.eligible_teachers ? b.eligible_teachers.length : 1;
    return aLen - bLen;
  });

  const scheduledAssignments = [];

  function solveRecursive(index) {
    if (index >= itemsToSchedule.length) {
      return true;
    }

    const item = itemsToSchedule[index];

    if (item.type === 'standard') {
      for (const day of days) {
        const currentCountOnDay = classDaySubjectCount.get(`${item.class_id}|${day}|${item.subject_id}`) || 0;
        if (currentCountOnDay >= item.max_per_day) continue;

        for (const p of teachingPeriods) {
          const pNum = p.period_number;
          if (!isClassFree(item.class_id, day, pNum)) continue;

          for (const teacherId of item.eligible_teachers) {
            if (!isTeacherFree(teacherId, day, pNum)) continue;

            // Commit move
            occupy(item.class_id, teacherId, day, pNum, item.subject_id);
            scheduledAssignments.push({
              item_id: item.id,
              class_id: item.class_id,
              subject_id: item.subject_id,
              teacher_id: teacherId,
              day_of_week: day,
              period_number: pNum,
              is_elective: false,
              track_id: null,
              subject_name: item.subject_name
            });

            if (solveRecursive(index + 1)) return true;

            // Backtrack
            scheduledAssignments.pop();
            release(item.class_id, teacherId, day, pNum, item.subject_id);
          }
        }
      }
    } else if (item.type === 'cluster') {
      // Cluster must satisfy all options and classes simultaneously
      for (const day of days) {
        for (const p of teachingPeriods) {
          const pNum = p.period_number;

          // Check if all classes in cluster are free
          const classesFree = item.classes.every(cId => isClassFree(cId, day, pNum));
          if (!classesFree) continue;

          // Check if all option teachers are free
          const teachersFree = item.options.every(opt => !opt.teacher_id || isTeacherFree(opt.teacher_id, day, pNum));
          if (!teachersFree) continue;

          // Commit cluster
          const committedOptions = [];
          for (let optIdx = 0; optIdx < item.options.length; optIdx++) {
            const opt = item.options[optIdx];
            const targetClassId = opt.target_class_id || item.classes[optIdx % item.classes.length];
            occupy(targetClassId, opt.teacher_id, day, pNum, opt.subject_id);
            committedOptions.push({
              item_id: item.id,
              class_id: targetClassId,
              subject_id: opt.subject_id,
              teacher_id: opt.teacher_id,
              day_of_week: day,
              period_number: pNum,
              is_elective: true,
              track_id: opt.track_id || null,
              subject_name: opt.subject_name
            });
          }

          for (const optAssign of committedOptions) {
            scheduledAssignments.push(optAssign);
          }

          if (solveRecursive(index + 1)) return true;

          // Backtrack cluster
          for (let optIdx = 0; optIdx < committedOptions.length; optIdx++) {
            const optAssign = scheduledAssignments.pop();
            release(optAssign.class_id, optAssign.teacher_id, day, pNum, optAssign.subject_id);
          }
        }
      }
    }

    return false;
  }

  const solved = solveRecursive(0);

  if (!solved) {
    return {
      success: false,
      status: 'INFEASIBLE_JS_CSP',
      diagnostics: [
        'JavaScript CSP solver could not find a non-conflicting schedule.',
        'Review teacher workloads, periods per week, and room/class period limits.'
      ]
    };
  }

  // Format final entries with room_number as class identity
  const entries = scheduledAssignments.map(assign => {
    const cInfo = classesMap.get(assign.class_id) || {};
    const tInfo = teachersMap.get(assign.teacher_id) || {};
    const pInfo = periodInfoMap.get(assign.period_number) || {};
    const className = cInfo.name || `Class ${assign.class_id}`;

    return {
      class_id: assign.class_id,
      subject_id: assign.subject_id,
      teacher_id: assign.teacher_id,
      day_of_week: assign.day_of_week,
      period_number: assign.period_number,
      start_time: pInfo.start_time || '08:00',
      end_time: pInfo.end_time || '08:45',
      room_number: className,
      is_elective: assign.is_elective,
      track_id: assign.track_id,
      subject_name: assign.subject_name || 'Subject',
      teacher_name: tInfo.name || 'Assigned Teacher'
    };
  });

  return {
    success: true,
    status: 'Optimal',
    entries,
    total_scheduled: entries.length,
    days,
    teaching_periods: teachingPeriods.map(p => p.period_number)
  };
}

/**
 * Unified solver entry point:
 * Uses Python MILP solver by default, falling back gracefully to JS CSP.
 */
async function solveTimetable(data) {
  try {
    const pythonResult = await runPythonSolver(data);
    return { ...pythonResult, solver_engine: 'python_milp_pulp' };
  } catch (pythonErr) {
    console.warn(`[TimetableSolver] Python solver unavailable or encountered error (${pythonErr.message}). Invoking JS CSP fallback solver...`);
    const jsResult = runJsFallbackSolver(data);
    return { ...jsResult, solver_engine: 'js_csp_mrv_fallback' };
  }
}

module.exports = {
  solveTimetable,
  runPythonSolver,
  runJsFallbackSolver
};
