const supabase = require('../utils/supabaseClient.js');
const { sendInAppNotificationWithHistory } = require('../services/notificationDelivery.service.js');

const INTERNAL_STATUS = {
    pending: 'pending',
    acknowledged: 'open',
    in_progress: 'in_progress',
    resolved: 'resolved',
};

const toWorkflowStatus = (status) => {
    if (status === INTERNAL_STATUS.acknowledged) return 'acknowledged';
    if (status === INTERNAL_STATUS.in_progress) return 'in_progress';
    if (status === INTERNAL_STATUS.resolved) return 'resolved';
    return 'pending';
};

const canEditOrDeleteForUser = (status) => {
    return status === INTERNAL_STATUS.pending || status === INTERNAL_STATUS.resolved;
};

const notifyTicketOwner = async ({ userId, institutionId, title, message, ticketId, action }) => {
    try {
        await sendInAppNotificationWithHistory({
            user_id: userId,
            institution_id: institutionId || null,
            title,
            message,
            type: 'info',
            data: {
                source: 'support_ticket',
                support_ticket_id: ticketId,
                action,
            },
        });
    } catch (error) {
        console.error('Failed to notify support ticket owner:', error);
    }
};

const mapTicket = (ticket) => ({
    ...ticket,
    workflow_status: toWorkflowStatus(ticket.status),
    can_edit: canEditOrDeleteForUser(ticket.status),
    can_delete: canEditOrDeleteForUser(ticket.status),
});

/**
 * Get tickets for the authenticated user
 */
exports.getMyTickets = async (req, res) => {
    try {
        const { userId } = req;
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const mapped = (data || []).map(mapTicket);
        res.status(200).json({ tickets: mapped });
    } catch (error) {
        console.error("Error fetching user tickets:", error);
        res.status(500).json({ error: "Failed to fetch tickets" });
    }
};

/**
 * Create a new support ticket
 */
exports.createTicket = async (req, res) => {
    try {
        const { userId, institution_id } = req;
        const { subject, description, category, priority = 'normal' } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ error: "Subject and Description are required" });
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .insert([{
                user_id: userId,
                institution_id,
                subject,
                description,
                category,
                priority,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        await notifyTicketOwner({
            userId,
            institutionId: institution_id,
            title: 'Support ticket created',
            message: 'Your support ticket has been created and is pending acknowledgement.',
            ticketId: data.id,
            action: 'created',
        });

        // Optional: Create initial message from description? 
        // Or just let description be the first "post"
        
        res.status(201).json({
            message: "Ticket created successfully",
            ticket: {
                ...data,
                workflow_status: toWorkflowStatus(data.status),
                can_edit: canEditOrDeleteForUser(data.status),
                can_delete: canEditOrDeleteForUser(data.status),
            },
        });
    } catch (error) {
        console.error("Error creating support ticket:", error);
        res.status(500).json({ error: "Failed to create support ticket" });
    }
};

/**
 * Get ticket details including messages
 */
exports.getTicketDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, userRole } = req;

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) return res.status(404).json({ error: "Ticket not found" });

        // Security: only creator or Master Admin (or assignee) can see details
        if (ticket.user_id !== userId && userRole !== 'master_admin' && ticket.assigned_to_id !== userId) {
            return res.status(403).json({ error: "Unauthorized access to this ticket" });
        }

        const { data: messages, error: msgError } = await supabase
            .from('ticket_messages')
            .select('*, sender:sender_id(first_name, last_name, full_name, role)')
            .eq('ticket_id', id)
            .eq('is_internal', false) // Users cannot see internal notes
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        const mappedTicket = mapTicket(ticket);

        res.status(200).json({ ticket: mappedTicket, messages });
    } catch (error) {
        console.error("Error fetching ticket details:", error);
        res.status(500).json({ error: "Failed to fetch ticket details" });
    }
};

/**
 * Add a message to a ticket
 */
exports.addTicketMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, userRole } = req;
        const { message } = req.body;

        if (!message) return res.status(400).json({ error: "Message is required" });

        // Check ownership
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('user_id, institution_id, status')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) return res.status(404).json({ error: "Ticket not found" });
        if (ticket.user_id !== userId && userRole !== 'master_admin') {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { data, error } = await supabase
            .from('ticket_messages')
            .insert([{
                ticket_id: id,
                sender_id: userId,
                message,
                is_internal: false
            }])
            .select()
            .single();

        if (error) throw error;

        // If user replies, and status was 'awaiting_customer', maybe move back to 'open'
        if (ticket.status === 'awaiting_customer') {
            await supabase.from('support_tickets')
                .update({ status: 'open', updated_at: new Date().toISOString() })
                .eq('id', id);
        }

        if (userRole !== 'master_admin') {
            await notifyTicketOwner({
                userId,
                institutionId: ticket?.institution_id || null,
                title: 'Support ticket updated',
                message: 'A new message has been added to your support ticket.',
                ticketId: id,
                action: 'message_added',
            });
        }

        res.status(201).json({ message: "Message added", data });
    } catch (error) {
        console.error("Error adding message:", error);
        res.status(500).json({ error: "Failed to add message" });
    }
};

/**
 * Update ticket by owner (allowed only before acknowledged and after resolved)
 */
exports.updateMyTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;
        const { subject, description, category, priority } = req.body || {};

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('id, user_id, status, institution_id')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });
        if (!canEditOrDeleteForUser(ticket.status)) {
            return res.status(400).json({ error: 'Ticket cannot be edited in the current status.' });
        }

        const updates = { updated_at: new Date().toISOString() };
        if (typeof subject === 'string' && subject.trim()) updates.subject = subject.trim();
        if (typeof description === 'string' && description.trim()) updates.description = description.trim();
        if (typeof category === 'string') updates.category = category.trim();
        if (typeof priority === 'string') updates.priority = priority.trim();

        if (Object.keys(updates).length === 1) {
            return res.status(400).json({ error: 'No valid fields provided for update.' });
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select('*')
            .single();

        if (error) throw error;

        res.status(200).json({
            message: 'Ticket updated successfully',
            ticket: mapTicket(data),
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
};

/**
 * Delete ticket by owner (allowed only before acknowledged and after resolved)
 */
exports.deleteMyTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req;

        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select('id, user_id, status')
            .eq('id', id)
            .single();

        if (ticketError || !ticket) return res.status(404).json({ error: 'Ticket not found' });
        if (ticket.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });
        if (!canEditOrDeleteForUser(ticket.status)) {
            return res.status(400).json({ error: 'Ticket cannot be deleted in the current status.' });
        }

        const { error } = await supabase
            .from('support_tickets')
            .delete()
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
};
