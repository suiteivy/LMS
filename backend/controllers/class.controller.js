const supabase = require("../utils/supabaseClient");

/**
 * Create a new class
 */
exports.createClass = async (req, res) => {
    try {
        const { name, grade_level, capacity, teacher_id } = req.body;
        const institution_id = req.institution_id;

        if (!name) {
            return res.status(400).json({ error: "Class name is required" });
        }

        const insertData = {
            name,
            institution_id: institution_id || null,
        };
        if (grade_level) insertData.grade_level = grade_level;
        if (capacity) insertData.capacity = capacity;
        if (teacher_id) insertData.teacher_id = teacher_id;

        const { data, error } = await supabase
            .from("classes")
            .insert(insertData)
            .select("*")
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("createClass error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update a class
 */
exports.updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, grade_level, capacity, teacher_id } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (grade_level !== undefined) updates.grade_level = grade_level;
        if (capacity !== undefined) updates.capacity = capacity;
        if (teacher_id !== undefined) updates.teacher_id = teacher_id || null;

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }

        const { data, error } = await supabase
            .from("classes")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("updateClass error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete a class (only if no students are enrolled)
 */
exports.deleteClass = async (req, res) => {
    try {
        const { id } = req.params;

        // Check for enrolled students
        const { count } = await supabase
            .from("class_enrollments")
            .select("id", { count: "exact", head: true })
            .eq("class_id", id);

        if (count && count > 0) {
            return res.status(400).json({
                error: `Cannot delete class with ${count} enrolled students. Remove students first.`,
            });
        }

        const { error } = await supabase.from("classes").delete().eq("id", id);
        if (error) throw error;

        res.json({ message: "Class deleted successfully" });
    } catch (err) {
        console.error("deleteClass error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all classes for the institution (with student count)
 */
exports.getClasses = async (req, res) => {
    try {
        const institution_id = req.institution_id;

        let query = supabase.from("classes").select("*");
        if (institution_id) {
            query = query.eq("institution_id", institution_id);
        }

        const { data: classes, error } = await query.order("name");
        if (error) throw error;

        // Get student counts for each class
        const classesWithCounts = await Promise.all(
            (classes || []).map(async (cls) => {
                const { count } = await supabase
                    .from("class_enrollments")
                    .select("id", { count: "exact", head: true })
                    .eq("class_id", cls.id);

                return {
                    ...cls,
                    student_count: count || 0,
                };
            })
        );

        res.json(classesWithCounts);
    } catch (err) {
        console.error("getClasses error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get students enrolled in a specific class
 */
exports.getClassStudents = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from("class_enrollments")
            .select(`
        id,
        student_id,
        enrolled_at,
        students (
          id,
          grade_level,
          user_id,
          users:user_id (
            full_name,
            email
          )
        )
      `)
            .eq("class_id", id);

        if (error) throw error;

        const students = (data || []).map((enrollment) => ({
            enrollment_id: enrollment.id,
            student_id: enrollment.student_id,
            enrolled_at: enrollment.enrolled_at,
            full_name: enrollment.students?.users?.full_name || "Unknown",
            email: enrollment.students?.users?.email || "",
            grade_level: enrollment.students?.grade_level || "",
        }));

        res.json(students);
    } catch (err) {
        console.error("getClassStudents error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Enroll a student in a class
 */
exports.enrollStudent = async (req, res) => {
    try {
        const { id } = req.params; // class_id
        const { student_id } = req.body;

        if (!student_id) {
            return res.status(400).json({ error: "student_id is required" });
        }

        // Check if class exists
        const { data: cls, error: classErr } = await supabase
            .from("classes")
            .select("id, capacity")
            .eq("id", id)
            .single();

        if (classErr || !cls) {
            return res.status(404).json({ error: "Class not found" });
        }

        // Check capacity
        if (cls.capacity) {
            const { count } = await supabase
                .from("class_enrollments")
                .select("id", { count: "exact", head: true })
                .eq("class_id", id);

            if (count >= cls.capacity) {
                return res.status(400).json({ error: "Class has reached maximum capacity" });
            }
        }

        // Check if already enrolled in this class
        const { data: existing } = await supabase
            .from("class_enrollments")
            .select("id")
            .eq("class_id", id)
            .eq("student_id", student_id)
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: "Student is already enrolled in this class" });
        }

        const { data, error } = await supabase
            .from("class_enrollments")
            .insert({ class_id: id, student_id })
            .select("*")
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        console.error("enrollStudent error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Remove a student from a class
 */
exports.removeStudent = async (req, res) => {
    try {
        const { id, studentId } = req.params;

        const { error } = await supabase
            .from("class_enrollments")
            .delete()
            .eq("class_id", id)
            .eq("student_id", studentId);

        if (error) throw error;
        res.json({ message: "Student removed from class" });
    } catch (err) {
        console.error("removeStudent error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Auto-assign unassigned students to classes for a given grade level.
 * Uses round-robin distribution, respecting capacity limits.
 */
exports.autoAssignStudents = async (req, res) => {
    try {
        const { grade_level } = req.body;
        const institution_id = req.institution_id;

        if (!grade_level) {
            return res.status(400).json({ error: "grade_level is required" });
        }

        // 1. Get all classes for this grade level
        let classQuery = supabase
            .from("classes")
            .select("id, name, capacity")
            .eq("grade_level", grade_level);

        if (institution_id) {
            classQuery = classQuery.eq("institution_id", institution_id);
        }

        const { data: classes, error: classErr } = await classQuery;
        if (classErr) throw classErr;

        if (!classes || classes.length === 0) {
            return res.status(400).json({ error: `No classes found for grade level: ${grade_level}` });
        }

        // 2. Get current enrollment counts per class
        const classData = await Promise.all(
            classes.map(async (cls) => {
                const { count } = await supabase
                    .from("class_enrollments")
                    .select("id", { count: "exact", head: true })
                    .eq("class_id", cls.id);

                return {
                    ...cls,
                    current_count: count || 0,
                };
            })
        );

        // 3. Get all students of this grade not enrolled in any class
        const { data: allStudents, error: studErr } = await supabase
            .from("students")
            .select("id, grade_level")
            .eq("grade_level", grade_level);

        if (studErr) throw studErr;

        if (!allStudents || allStudents.length === 0) {
            return res.json({ assigned: 0, message: "No students found for this grade level" });
        }

        // Get students already enrolled in ANY class
        const studentIds = allStudents.map((s) => s.id);
        const { data: enrolled } = await supabase
            .from("class_enrollments")
            .select("student_id")
            .in("student_id", studentIds);

        const enrolledSet = new Set((enrolled || []).map((e) => e.student_id));
        const unassigned = allStudents.filter((s) => !enrolledSet.has(s.id));

        if (unassigned.length === 0) {
            return res.json({ assigned: 0, message: "All students are already assigned to classes" });
        }

        // 4. Round-robin assignment sorted by current count (lowest first)
        classData.sort((a, b) => a.current_count - b.current_count);

        const assignments = [];
        let classIdx = 0;

        for (const student of unassigned) {
            // Find next class with available capacity
            let attempts = 0;
            while (attempts < classData.length) {
                const cls = classData[classIdx % classData.length];
                const hasCapacity = !cls.capacity || cls.current_count < cls.capacity;

                if (hasCapacity) {
                    assignments.push({
                        class_id: cls.id,
                        student_id: student.id,
                    });
                    cls.current_count++;
                    classIdx++;
                    break;
                }

                classIdx++;
                attempts++;
            }
        }

        if (assignments.length === 0) {
            return res.json({ assigned: 0, message: "All classes are at capacity" });
        }

        // 5. Bulk insert
        const { error: insertErr } = await supabase
            .from("class_enrollments")
            .insert(assignments);

        if (insertErr) throw insertErr;

        // Build summary
        const summary = classData.map((cls) => ({
            class_name: cls.name,
            total_students: cls.current_count,
        }));

        res.json({
            assigned: assignments.length,
            total_unassigned_before: unassigned.length,
            classes: summary,
            message: `Successfully assigned ${assignments.length} students across ${classData.length} classes`,
        });
    } catch (err) {
        console.error("autoAssignStudents error:", err);
        res.status(500).json({ error: err.message });
    }
};
