const { compilePdfBuffer } = require("../services/pdfCompiler.service.js");
const supabase = require("../utils/supabaseClient.js");

exports.compilePdf = async (req, res) => {
  try {
    const { document_type, data } = req.body;

    if (!document_type || !data) {
      return res.status(400).json({ success: false, error: "document_type and data are required" });
    }

    // Enrich with institution info if not present
    if (!data.institution_name && req.user?.institution_id) {
      const { data: inst } = await supabase
        .from("institutions")
        .select("name, logo_url")
        .eq("id", req.user.institution_id)
        .maybeSingle();
      if (inst) {
        data.institution_name = inst.name;
        data.institution_logo = inst.logo_url;
      }
    }

    const pdfBuffer = await compilePdfBuffer({ document_type, data });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${document_type}-${Date.now()}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error("compilePdf error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.compilePdfBase64 = async (req, res) => {
  try {
    const { document_type, data } = req.body;

    if (!document_type || !data) {
      return res.status(400).json({ success: false, error: "document_type and data are required" });
    }

    if (!data.institution_name && req.user?.institution_id) {
      const { data: inst } = await supabase
        .from("institutions")
        .select("name, logo_url")
        .eq("id", req.user.institution_id)
        .maybeSingle();
      if (inst) {
        data.institution_name = inst.name;
        data.institution_logo = inst.logo_url;
      }
    }

    const pdfBuffer = await compilePdfBuffer({ document_type, data });
    const b64 = pdfBuffer.toString("base64");

    return res.json({
      success: true,
      data: {
        base64: b64,
        size_bytes: pdfBuffer.length,
        mime_type: "application/pdf",
      },
    });
  } catch (error) {
    console.error("compilePdfBase64 error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
