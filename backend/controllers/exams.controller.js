const supabase = require("../utils/supabaseClient");

/**
 * Exams Management
 */
exports.createExam = async (req, res) => {
    try {
        const { institution_id } = req;
        const { subject_id, teacher_id, title, description, date, max_score, weight, term, is_published } = req.body;

        const { data, error } = await supabase
            .from("exams")
            .insert([{
                institution_id,
                subject_id,
                teacher_id,
                title,
                description,
                date,
                max_score,
                weight: weight || 0,
                term,
                is_published: is_published !== undefined ? is_published : true
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getExams = async (req, res) => {
    try {
        const { subject_id } = req.query;
        const { institution_id } = req;
        let query = supabase.from("exams").select("*").eq("institution_id", institution_id);
        if (subject_id) query = query.eq("subject_id", subject_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Exam Results (Grading)
 */
exports.recordExamResult = async (req, res) => {
    try {
        const { exam_id, student_id, score, feedback, graded_by } = req.body;
        const { institution_id } = req;

        const { data, error } = await supabase
            .from("exam_results")
            .upsert({ exam_id, student_id, score, feedback, graded_by, institution_id }, { onConflict: "exam_id, student_id" })
            .select();

        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getExamResults = async (req, res) => {
    try {
        const { exam_id, student_id } = req.query;
        const { institution_id } = req;
        let query = supabase.from("exam_results")
            .select("*, student:students(user:users(full_name))")
            .eq("institution_id", institution_id);

        if (exam_id) query = query.eq("exam_id", exam_id);
        if (student_id) query = query.eq("student_id", student_id);

        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
