// backend/controllers/documents.controller.js
const path = require("node:path");
const supabase = require("../utils/supabaseClient.js");

/**
 * Helper to generate a short-lived signed URL for a private storage path
 */
async function createDocumentSignedUrl(storagePath, expiresInSeconds = 3600) {
  try {
    if (!storagePath) return null;
    // Remove bucket prefix if included
    const cleanPath = storagePath.startsWith('documents/') ? storagePath.slice(10) : storagePath;
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(cleanPath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      // Fallback to public URL or direct path
      const { data: pubData } = supabase.storage.from('documents').getPublicUrl(cleanPath);
      return pubData?.publicUrl || null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn('[createDocumentSignedUrl] error:', err.message);
    return null;
  }
}

/**
 * Upload and publish a document to target audience with delivery resolution
 */
exports.uploadAndPublishDocument = async (req, res) => {
  try {
    const { institution_id, userId } = req;
    const {
      title,
      description,
      category = 'circular',
      storage_path,
      file_name,
      file_size,
      mime_type = 'application/pdf',
      is_pinned = false,
      expires_at = null,
      auto_deliver_new_students = true,
      audiences = [{ audience_type: 'institution' }]
    } = req.body;

    if (!title || !storage_path || !file_name) {
      return res.status(400).json({ error: "Title, storage_path, and file_name are required." });
    }

    // 1. Insert document record
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert([{
        institution_id,
        title: title.trim(),
        description: description?.trim() || null,
        category,
        storage_path,
        file_name,
        file_size: Number(file_size) || null,
        mime_type,
        is_pinned: Boolean(is_pinned),
        expires_at: expires_at || null,
        auto_deliver_new_students: Boolean(auto_deliver_new_students),
        status: 'published',
        version_label: '1.0',
        uploaded_by: userId,
        published_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (docErr) throw docErr;

    // 2. Insert Audiences
    const audienceRows = (audiences || []).map(a => ({
      document_id: doc.id,
      audience_type: a.audience_type,
      audience_id: a.audience_id || null
    }));

    if (audienceRows.length > 0) {
      await supabase.from('document_audiences').insert(audienceRows);
    }

    // 3. Resolve Delivery Recipients
    const recipientsMap = new Map(); // key: `${userId}_${studentId || 'none'}` -> { userId, studentId }

    for (const aud of audiences) {
      if (aud.audience_type === 'institution') {
        // All students and parents in institution
        const { data: students } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('institution_id', institution_id)
          .eq('status', 'active');

        (students || []).forEach(s => {
          if (s.user_id) recipientsMap.set(`${s.user_id}_${s.id}`, { userId: s.user_id, studentId: s.id });
        });

        // Parents
        const { data: parents } = await supabase
          .from('parent_students')
          .select('parent:parents(user_id), student_id')
          .eq('institution_id', institution_id);

        (parents || []).forEach(p => {
          if (p.parent?.user_id) {
            recipientsMap.set(`${p.parent.user_id}_${p.student_id}`, { userId: p.parent.user_id, studentId: p.student_id });
          }
        });
      } else if (aud.audience_type === 'level') {
        const levelVal = Number(aud.audience_id);
        const { data: students } = await supabase
          .from('students')
          .select('id, user_id, grade_level, form_level')
          .eq('institution_id', institution_id)
          .or(`grade_level.eq.${levelVal},form_level.eq.${levelVal}`);

        const stuIds = (students || []).map(s => s.id);
        (students || []).forEach(s => {
          if (s.user_id) recipientsMap.set(`${s.user_id}_${s.id}`, { userId: s.user_id, studentId: s.id });
        });

        if (stuIds.length > 0) {
          const { data: parents } = await supabase
            .from('parent_students')
            .select('parent:parents(user_id), student_id')
            .in('student_id', stuIds);

          (parents || []).forEach(p => {
            if (p.parent?.user_id) {
              recipientsMap.set(`${p.parent.user_id}_${p.student_id}`, { userId: p.parent.user_id, studentId: p.student_id });
            }
          });
        }
      } else if (aud.audience_type === 'class') {
        const classId = aud.audience_id;
        const { data: enrollments } = await supabase
          .from('class_enrollments')
          .select('student:students(id, user_id)')
          .eq('class_id', classId)
          .eq('status', 'enrolled');

        const stuIds = [];
        (enrollments || []).forEach(e => {
          if (e.student?.id) {
            stuIds.push(e.student.id);
            if (e.student.user_id) {
              recipientsMap.set(`${e.student.user_id}_${e.student.id}`, { userId: e.student.user_id, studentId: e.student.id });
            }
          }
        });

        if (stuIds.length > 0) {
          const { data: parents } = await supabase
            .from('parent_students')
            .select('parent:parents(user_id), student_id')
            .in('student_id', stuIds);

          (parents || []).forEach(p => {
            if (p.parent?.user_id) {
              recipientsMap.set(`${p.parent.user_id}_${p.student_id}`, { userId: p.parent.user_id, studentId: p.student_id });
            }
          });
        }
      } else if (aud.audience_type === 'student') {
        const studentId = aud.audience_id;
        const { data: student } = await supabase
          .from('students')
          .select('id, user_id')
          .eq('id', studentId)
          .maybeSingle();

        if (student?.user_id) {
          recipientsMap.set(`${student.user_id}_${student.id}`, { userId: student.user_id, studentId: student.id });
        }

        const { data: parents } = await supabase
          .from('parent_students')
          .select('parent:parents(user_id), student_id')
          .eq('student_id', studentId);

        (parents || []).forEach(p => {
          if (p.parent?.user_id) {
            recipientsMap.set(`${p.parent.user_id}_${p.student_id}`, { userId: p.parent.user_id, studentId: p.student_id });
          }
        });
      }
    }

    // 4. Batch Insert Deliveries
    const deliveryRows = Array.from(recipientsMap.values()).map(r => ({
      document_id: doc.id,
      institution_id,
      user_id: r.userId,
      student_id: r.studentId || null,
      delivered_at: new Date().toISOString()
    }));

    if (deliveryRows.length > 0) {
      await supabase.from('document_deliveries').insert(deliveryRows).select();

      // 5. Create notifications
      const notifRows = deliveryRows.map(d => ({
        institution_id,
        user_id: d.user_id,
        title: `New Document: ${doc.title}`,
        message: doc.description || `A new official document (${doc.category}) has been published for your attention.`,
        type: 'document_published',
        reference_id: doc.id,
        reference_type: 'document',
        created_at: new Date().toISOString()
      }));

      await supabase.from('notifications').insert(notifRows).catch(e => console.warn('Notification insert warn:', e.message));
    }

    res.status(201).json({
      success: true,
      document: doc,
      recipient_count: deliveryRows.length
    });
  } catch (error) {
    console.error('uploadAndPublishDocument error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * List documents delivered to the authenticated user
 */
exports.getDeliveredDocuments = async (req, res) => {
  try {
    const { userId, institution_id } = req;
    const { category, search, student_id, unread_only } = req.query;

    let query = supabase
      .from('document_deliveries')
      .select(`
        id,
        delivered_at,
        viewed_at,
        downloaded_at,
        student_id,
        student:students(
          id,
          admission_number,
          users:users!students_user_id_fkey(full_name, first_name, last_name)
        ),
        document:documents(
          id,
          title,
          description,
          category,
          storage_path,
          file_name,
          file_size,
          mime_type,
          is_pinned,
          published_at,
          status,
          version_label
        )
      `)
      .eq('institution_id', institution_id)
      .eq('user_id', userId)
      .eq('document.status', 'published')
      .order('delivered_at', { ascending: false });

    if (student_id && student_id !== 'all') {
      query = query.eq('student_id', student_id);
    }

    if (unread_only === 'true') {
      query = query.is('viewed_at', null);
    }

    const { data: deliveries, error } = await query;
    if (error) throw error;

    // Filter by category or search in memory
    let filtered = (deliveries || []).filter(d => !!d.document);

    if (category && category !== 'all') {
      filtered = filtered.filter(d => d.document.category === category);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(d => 
        d.document.title.toLowerCase().includes(q) ||
        (d.document.description && d.document.description.toLowerCase().includes(q)) ||
        d.document.file_name.toLowerCase().includes(q)
      );
    }

    // Enrich with signed download URLs
    const enriched = await Promise.all(
      filtered.map(async (item) => {
        const signedUrl = await createDocumentSignedUrl(item.document.storage_path);
        return {
          delivery_id: item.id,
          delivered_at: item.delivered_at,
          viewed_at: item.viewed_at,
          downloaded_at: item.downloaded_at,
          is_read: !!item.viewed_at,
          student_id: item.student_id,
          student_name: item.student?.users?.full_name || 'All Children',
          student_admission: item.student?.admission_number,
          ...item.document,
          signed_url: signedUrl
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('getDeliveredDocuments error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Record that a document was viewed or downloaded by the recipient
 */
exports.recordDocumentInteraction = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId, institution_id } = req;
    const { action = 'view' } = req.body; // 'view' or 'download'

    const nowIso = new Date().toISOString();
    const updateData = action === 'download' 
      ? { downloaded_at: nowIso, viewed_at: nowIso } 
      : { viewed_at: nowIso };

    const { data, error } = await supabase
      .from('document_deliveries')
      .update(updateData)
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .eq('institution_id', institution_id)
      .select();

    if (error) throw error;
    res.json({ success: true, updated: data?.length || 0 });
  } catch (error) {
    console.error('recordDocumentInteraction error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Admin view: Track document delivery, views, downloads, and unread recipients
 */
exports.getDocumentTracking = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { institution_id } = req;

    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('institution_id', institution_id)
      .single();

    if (docErr || !doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const { data: deliveries, error: delErr } = await supabase
      .from('document_deliveries')
      .select(`
        id,
        delivered_at,
        viewed_at,
        downloaded_at,
        user:users!document_deliveries_user_id_fkey(id, full_name, role, email),
        student:students(id, admission_number, grade_level, users:users!students_user_id_fkey(full_name))
      `)
      .eq('document_id', documentId)
      .eq('institution_id', institution_id);

    if (delErr) throw delErr;

    const totalDelivered = deliveries?.length || 0;
    const totalViewed = deliveries?.filter(d => !!d.viewed_at).length || 0;
    const totalDownloaded = deliveries?.filter(d => !!d.downloaded_at).length || 0;
    const totalUnread = totalDelivered - totalViewed;

    const recipients = (deliveries || []).map(d => ({
      delivery_id: d.id,
      recipient_name: d.user?.full_name || 'Unknown',
      recipient_email: d.user?.email,
      role: d.user?.role,
      student_name: d.student?.users?.full_name || null,
      admission_number: d.student?.admission_number || null,
      viewed_at: d.viewed_at,
      downloaded_at: d.downloaded_at,
      is_unread: !d.viewed_at
    }));

    res.json({
      document: doc,
      stats: {
        total_delivered: totalDelivered,
        total_viewed: totalViewed,
        total_downloaded: totalDownloaded,
        total_unread: totalUnread,
        view_rate_percent: totalDelivered > 0 ? Math.round((totalViewed / totalDelivered) * 100) : 0
      },
      recipients
    });
  } catch (error) {
    console.error('getDocumentTracking error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Withdraw or archive a published document
 */
exports.withdrawDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { institution_id } = req;

    const { data, error } = await supabase
      .from('documents')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', documentId)
      .eq('institution_id', institution_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, document: data });
  } catch (error) {
    console.error('withdrawDocument error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Remind recipients who have not opened the document
 */
exports.remindUnopenedRecipients = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { institution_id } = req;

    const { data: doc } = await supabase
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .eq('institution_id', institution_id)
      .single();

    if (!doc) return res.status(404).json({ error: "Document not found" });

    const { data: unopened } = await supabase
      .from('document_deliveries')
      .select('user_id')
      .eq('document_id', documentId)
      .eq('institution_id', institution_id)
      .is('viewed_at', null);

    if (!unopened || unopened.length === 0) {
      return res.json({ success: true, reminded_count: 0, message: "All recipients have already viewed this document." });
    }

    const notifRows = unopened.map(u => ({
      institution_id,
      user_id: u.user_id,
      title: `Reminder: Please review ${doc.title}`,
      message: `You have an unread official document "${doc.title}" awaiting your review.`,
      type: 'document_reminder',
      reference_id: documentId,
      reference_type: 'document',
      created_at: new Date().toISOString()
    }));

    await supabase.from('notifications').insert(notifRows);

    res.json({ success: true, reminded_count: unopened.length });
  } catch (error) {
    console.error('remindUnopenedRecipients error:', error);
    res.status(500).json({ error: error.message });
  }
};
