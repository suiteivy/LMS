// controllers/curriculumContent.controller.js
const supabase = require("../utils/supabaseClient.js");

/**
 * Get all Topic Areas for a subject
 * Plain labels: Topic Area
 */
exports.getTopicAreas = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const institutionId = req.institution_id;

    if (!subjectId) {
      return res.status(400).json({ error: "Subject ID is required" });
    }

    const { data, error } = await supabase
      .from("subject_topic_areas")
      .select("*, topics:subject_topics(*)")
      .eq("subject_id", subjectId)
      .eq("institution_id", institutionId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error("getTopicAreas error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new Topic Area under a subject
 */
exports.createTopicArea = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const { name, description, sort_order = 0 } = req.body;
    const institutionId = req.institution_id;

    if (!subjectId || !name) {
      return res.status(400).json({ error: "Subject ID and Topic Area name are required" });
    }

    // Verify subject belongs to institution
    const { data: subject, error: subjErr } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", subjectId)
      .eq("institution_id", institutionId)
      .single();

    if (subjErr || !subject) {
      return res.status(404).json({ error: "Subject not found for institution" });
    }

    const { data, error } = await supabase
      .from("subject_topic_areas")
      .insert([
        {
          institution_id: institutionId,
          subject_id: subjectId,
          name: name.trim(),
          description: description || null,
          sort_order: Number(sort_order) || 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: "Topic Area created successfully", data });
  } catch (err) {
    console.error("createTopicArea error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a Topic Area
 */
exports.updateTopicArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order } = req.body;
    const institutionId = req.institution_id;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = description;
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("subject_topic_areas")
      .update(updates)
      .eq("id", id)
      .eq("institution_id", institutionId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Topic Area not found" });

    res.json({ message: "Topic Area updated successfully", data });
  } catch (err) {
    console.error("updateTopicArea error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a Topic Area
 */
exports.deleteTopicArea = async (req, res) => {
  try {
    const { id } = req.params;
    const institutionId = req.institution_id;

    const { error } = await supabase
      .from("subject_topic_areas")
      .delete()
      .eq("id", id)
      .eq("institution_id", institutionId);

    if (error) throw error;
    res.json({ message: "Topic Area deleted successfully" });
  } catch (err) {
    console.error("deleteTopicArea error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get all Topics for a Topic Area
 * Plain label: Topic
 */
exports.getTopics = async (req, res) => {
  try {
    const { topicAreaId } = req.params;
    const institutionId = req.institution_id;

    if (!topicAreaId) {
      return res.status(400).json({ error: "Topic Area ID is required" });
    }

    const { data, error } = await supabase
      .from("subject_topics")
      .select("*")
      .eq("topic_area_id", topicAreaId)
      .eq("institution_id", institutionId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error("getTopics error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Create a new Topic inside a Topic Area
 */
exports.createTopic = async (req, res) => {
  try {
    const { topicAreaId } = req.params;
    const { name, description, sort_order = 0 } = req.body;
    const institutionId = req.institution_id;

    if (!topicAreaId || !name) {
      return res.status(400).json({ error: "Topic Area ID and Topic name are required" });
    }

    // Verify parent Topic Area
    const { data: area, error: areaErr } = await supabase
      .from("subject_topic_areas")
      .select("id")
      .eq("id", topicAreaId)
      .eq("institution_id", institutionId)
      .single();

    if (areaErr || !area) {
      return res.status(404).json({ error: "Topic Area not found for institution" });
    }

    const { data, error } = await supabase
      .from("subject_topics")
      .insert([
        {
          institution_id: institutionId,
          topic_area_id: topicAreaId,
          name: name.trim(),
          description: description || null,
          sort_order: Number(sort_order) || 0,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: "Topic created successfully", data });
  } catch (err) {
    console.error("createTopic error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Update a Topic
 */
exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, sort_order } = req.body;
    const institutionId = req.institution_id;

    const updates = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (description !== undefined) updates.description = description;
    if (sort_order !== undefined) updates.sort_order = Number(sort_order);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("subject_topics")
      .update(updates)
      .eq("id", id)
      .eq("institution_id", institutionId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Topic not found" });

    res.json({ message: "Topic updated successfully", data });
  } catch (err) {
    console.error("updateTopic error:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Delete a Topic
 */
exports.deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const institutionId = req.institution_id;

    const { error } = await supabase
      .from("subject_topics")
      .delete()
      .eq("id", id)
      .eq("institution_id", institutionId);

    if (error) throw error;
    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error("deleteTopic error:", err);
    res.status(500).json({ error: err.message });
  }
};
