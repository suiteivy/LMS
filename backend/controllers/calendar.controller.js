const supabase = require('../utils/supabaseClient.js');
const { withSupabaseRetry } = require('../utils/supabaseRetry.js');

/**
 * GET /calendar/events
 * Fetch all calendar events for the user's institution
 */
exports.getEvents = async (req, res) => {
  try {
    const institutionId = req.institution_id;
    if (!institutionId && req.userRole !== 'master_admin') {
      return res.status(400).json({ error: 'Institution context missing' });
    }

    const { start_date, end_date, month, year } = req.query || {};

    let query = supabase
      .from('calendar_events')
      .select('*')
      .order('event_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (req.userRole !== 'master_admin') {
      query = query.eq('institution_id', institutionId);
    }

    if (start_date) {
      query = query.gte('event_date', start_date);
    }
    if (end_date) {
      query = query.lte('event_date', end_date);
    }

    if (year && month) {
      const padMonth = String(month).padStart(2, '0');
      const startOfMonth = `${year}-${padMonth}-01`;
      // Approximate month end
      const endOfMonth = `${year}-${padMonth}-31`;
      query = query.gte('event_date', startOfMonth).lte('event_date', endOfMonth);
    }

    const { data, error } = await withSupabaseRetry(() => query);
    if (error) throw error;

    return res.status(200).json({ events: data || [] });
  } catch (err) {
    console.error('getEvents error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch calendar events' });
  }
};

/**
 * POST /calendar/events
 * Create a new calendar event + auto-generate linked announcement
 * Restricted to admins.
 */
exports.createEvent = async (req, res) => {
  try {
    const institutionId = req.institution_id;
    const userId = req.userId;
    const userRole = req.userRole;

    if (userRole !== 'admin' && userRole !== 'master_admin') {
      return res.status(403).json({ error: 'Only administrators can create calendar events.' });
    }

    if (!institutionId && userRole !== 'master_admin') {
      return res.status(400).json({ error: 'Institution context missing' });
    }

    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type = 'event',
      cancel_classes = false,
      announcement_expiry_days,
    } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required.' });
    }

    if (!event_date || typeof event_date !== 'string') {
      return res.status(400).json({ error: 'Valid event date (YYYY-MM-DD) is required.' });
    }

    const isCancelClasses = Boolean(cancel_classes);

    // 1. Auto-generate corresponding Announcement
    let announcementId = null;
    try {
      const annTitle = isCancelClasses
        ? `🚨 [Classes Cancelled] ${title.trim()}`
        : `📅 [School Event] ${title.trim()}`;

      let annMessage = `${title.trim()} has been scheduled for ${event_date}`;
      if (start_time) annMessage += ` at ${start_time}`;
      if (end_time) annMessage += ` - ${end_time}`;
      annMessage += '.\n';

      if (isCancelClasses) {
        annMessage += '\n⚠️ Notice: All academic classes are CANCELLED for this day.';
      }
      if (description && description.trim()) {
        annMessage += `\n\nDetails:\n${description.trim()}`;
      }

      let expiresAt = null;
      if (announcement_expiry_days && Number(announcement_expiry_days) > 0) {
        const exp = new Date();
        exp.setDate(exp.getDate() + Number(announcement_expiry_days));
        expiresAt = exp.toISOString();
      } else {
        // Default expiry: end of the event day + 1 day
        const exp = new Date(`${event_date}T23:59:59Z`);
        if (!isNaN(exp.getTime())) {
          exp.setDate(exp.getDate() + 1);
          expiresAt = exp.toISOString();
        }
      }

      const { data: annData, error: annError } = await supabase
        .from('announcements')
        .insert({
          title: annTitle,
          message: annMessage,
          institution_id: institutionId,
          expires_at: expiresAt,
        })
        .select('id')
        .maybeSingle();

      if (!annError && annData?.id) {
        announcementId = annData.id;
      }
    } catch (annErr) {
      console.warn('Auto announcement creation non-fatal error:', annErr);
    }

    // 2. Insert calendar event
    const { data: eventData, error: insertError } = await supabase
      .from('calendar_events')
      .insert({
        institution_id: institutionId,
        created_by: userId || null,
        title: title.trim(),
        description: description ? description.trim() : null,
        event_date,
        start_time: start_time || null,
        end_time: end_time || null,
        event_type,
        cancel_classes: isCancelClasses,
        announcement_id: announcementId,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return res.status(201).json({
      event: eventData,
      announcement_created: Boolean(announcementId),
    });
  } catch (err) {
    console.error('createEvent error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create calendar event' });
  }
};

/**
 * PUT /calendar/events/:id
 * Update event and cascade changes to linked announcement
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.userRole;
    const institutionId = req.institution_id;

    if (userRole !== 'admin' && userRole !== 'master_admin') {
      return res.status(403).json({ error: 'Only administrators can edit calendar events.' });
    }

    const {
      title,
      description,
      event_date,
      start_time,
      end_time,
      event_type,
      cancel_classes,
    } = req.body || {};

    const { data: existing, error: findError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    if (userRole !== 'master_admin' && existing.institution_id !== institutionId) {
      return res.status(403).json({ error: 'Forbidden: access denied to event' });
    }

    const updatePayload = {};
    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;
    if (event_date !== undefined) updatePayload.event_date = event_date;
    if (start_time !== undefined) updatePayload.start_time = start_time || null;
    if (end_time !== undefined) updatePayload.end_time = end_time || null;
    if (event_type !== undefined) updatePayload.event_type = event_type;
    if (cancel_classes !== undefined) updatePayload.cancel_classes = Boolean(cancel_classes);
    updatePayload.updated_at = new Date().toISOString();

    const { data: updatedEvent, error: updateError } = await supabase
      .from('calendar_events')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    // Cascade update to linked announcement if exists
    if (existing.announcement_id) {
      try {
        const finalTitle = updatedEvent.title;
        const finalDate = updatedEvent.event_date;
        const isCancelled = updatedEvent.cancel_classes;

        const annTitle = isCancelled
          ? `🚨 [Classes Cancelled] ${finalTitle}`
          : `📅 [School Event] ${finalTitle}`;

        let annMessage = `${finalTitle} has been updated for ${finalDate}`;
        if (updatedEvent.start_time) annMessage += ` at ${updatedEvent.start_time}`;
        annMessage += '.\n';
        if (isCancelled) {
          annMessage += '\n⚠️ Notice: All academic classes are CANCELLED for this day.';
        }
        if (updatedEvent.description) {
          annMessage += `\n\nDetails:\n${updatedEvent.description}`;
        }

        await supabase
          .from('announcements')
          .update({
            title: annTitle,
            message: annMessage,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.announcement_id);
      } catch (annUpdateErr) {
        console.warn('Failed to cascade update to announcement:', annUpdateErr);
      }
    }

    return res.status(200).json({ event: updatedEvent });
  } catch (err) {
    console.error('updateEvent error:', err);
    return res.status(500).json({ error: err.message || 'Failed to update calendar event' });
  }
};

/**
 * DELETE /calendar/events/:id
 * Delete event and cascade deletion to linked announcement
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.userRole;
    const institutionId = req.institution_id;

    if (userRole !== 'admin' && userRole !== 'master_admin') {
      return res.status(403).json({ error: 'Only administrators can delete calendar events.' });
    }

    const { data: existing, error: findError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!existing) {
      return res.status(404).json({ error: 'Calendar event not found' });
    }

    if (userRole !== 'master_admin' && existing.institution_id !== institutionId) {
      return res.status(403).json({ error: 'Forbidden: access denied to event' });
    }

    // Delete linked announcement if present
    if (existing.announcement_id) {
      try {
        await supabase
          .from('announcements')
          .delete()
          .eq('id', existing.announcement_id);
      } catch (annDelErr) {
        console.warn('Failed to delete linked announcement:', annDelErr);
      }
    }

    const { error: delError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id);

    if (delError) throw delError;

    return res.status(200).json({ success: true, message: 'Calendar event deleted' });
  } catch (err) {
    console.error('deleteEvent error:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete calendar event' });
  }
};

/**
 * GET /calendar/cancelled-dates
 * Public/authenticated view of all dates with class cancellations
 */
exports.getCancelledDates = async (req, res) => {
  try {
    const institutionId = req.institution_id;
    if (!institutionId && req.userRole !== 'master_admin') {
      return res.status(400).json({ error: 'Institution context missing' });
    }

    let query = supabase
      .from('calendar_events')
      .select('id, event_date, title, description, start_time, end_time')
      .eq('cancel_classes', true);

    if (req.userRole !== 'master_admin') {
      query = query.eq('institution_id', institutionId);
    }

    const { data, error } = await withSupabaseRetry(() => query);
    if (error) throw error;

    return res.status(200).json({ cancelled_dates: data || [] });
  } catch (err) {
    console.error('getCancelledDates error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch cancelled dates' });
  }
};
