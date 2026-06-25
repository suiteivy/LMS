const process = require("node:process");
const supabase = require("../utils/supabaseClient.js");
const { createClient } = require("@supabase/supabase-js");

let serviceClientFactory = createClient;

const getServiceSupabase = () => {
    return serviceClientFactory(
        process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
};

exports.__setServiceClientFactoryForTest = (factory) => {
    serviceClientFactory = typeof factory === 'function' ? factory : createClient;
};

exports.createRequest = async (req, res) => {
    try {
        const { addon_type, notes } = req.body;
        const { institution_id, userId } = req;

        if (!addon_type) {
            return res.status(400).json({ error: "Addon type is required." });
        }

        const { data, error } = await supabase
            .from('addon_requests')
            .insert([{
                institution_id,
                user_id: userId,
                addon_type,
                notes,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: "Request submitted successfully", request: data });
    } catch (error) {
        console.error("Error creating addon request:", error);
        res.status(500).json({ error: "Failed to submit request" });
    }
};

exports.getInstitutionRequests = async (req, res) => {
    try {
        const { institution_id } = req;
        const { data, error } = await supabase
            .from('addon_requests')
            .select('*')
            .eq('institution_id', institution_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ requests: data });
    } catch (error) {
        console.error("Error fetching institution requests:", error);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
};

exports.getAllRequests = async (_req, res) => {
    try {
        const adminClient = getServiceSupabase();
        const { data, error } = await adminClient
            .from('addon_requests')
            .select(`
                *,
                institutions:institution_id(name),
                users:user_id(full_name, email)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ requests: data });
    } catch (error) {
        console.error("Error fetching all addon requests:", error);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
};

exports.updateRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: "Valid status is required." });
        }

        const adminClient = getServiceSupabase();

        // 1. Fetch current request to get institution_id and addon_type
        const { data: request, error: fetchErr } = await adminClient
            .from('addon_requests')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !request) {
            return res.status(404).json({ error: "Request not found." });
        }

        // 2. Update the request status
        const { data: updatedRequest, error: updateErr } = await adminClient
            .from('addon_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // NOTE: Approval does not mutate institution entitlements directly.
        // Institution add-ons/subscription fields are controlled exclusively
        // through master admin subscription management endpoints.

        res.status(200).json({ message: `Request ${status} successfully`, request: updatedRequest });
    } catch (error) {
        console.error("Error updating addon request status:", error);
        res.status(500).json({ error: "Failed to update request status" });
    }
};
