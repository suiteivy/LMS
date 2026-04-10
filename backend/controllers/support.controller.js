const supabase = require('../utils/supabaseClient.js');

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
        res.status(200).json({ tickets: data });
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

        // Optional: Create initial message from description? 
        // Or just let description be the first "post"
        
        res.status(201).json({ message: "Ticket created successfully", ticket: data });
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

        res.status(200).json({ ticket, messages });
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
            .select('user_id, status')
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

        res.status(201).json({ message: "Message added", data });
    } catch (error) {
        console.error("Error adding message:", error);
        res.status(500).json({ error: "Failed to add message" });
    }
};
