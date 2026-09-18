const { spawn } = require("child_process");
const path = require("path");

const PYTHON_SCRIPT = path.resolve(__dirname, "../scripts/compile_pdf.py");

/**
 * Compiles a high-fidelity vector PDF using ReportLab.
 * @param {Object} params
 * @param {string} params.document_type - 'clearance_confirmation' | 'violation_summary' | 'institutional_summary'
 * @param {Object} params.data - Document data payload
 * @returns {Promise<Buffer>} - Compiled PDF buffer
 */
function compilePdfBuffer({ document_type, data }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ document_type, data });
    const pyProcess = spawn("python", [PYTHON_SCRIPT, "-"]);

    const stdoutChunks = [];
    const stderrChunks = [];

    pyProcess.stdout.on("data", (chunk) => {
      stdoutChunks.push(chunk);
    });

    pyProcess.stderr.on("data", (chunk) => {
      stderrChunks.push(chunk);
    });

    pyProcess.on("error", (err) => {
      reject(new Error(`Failed to spawn Python PDF compiler: ${err.message}`));
    });

    pyProcess.on("close", (code) => {
      if (code !== 0) {
        const stderrStr = Buffer.concat(stderrChunks).toString("utf-8");
        return reject(new Error(`Python PDF compiler exited with code ${code}: ${stderrStr}`));
      }

      try {
        const stdoutStr = Buffer.concat(stdoutChunks).toString("utf-8");
        const parsed = JSON.parse(stdoutStr);
        if (!parsed.success || !parsed.base64) {
          return reject(new Error(parsed.error || "Invalid response from PDF compiler"));
        }
        const pdfBuffer = Buffer.from(parsed.base64, "base64");
        resolve(pdfBuffer);
      } catch (parseErr) {
        reject(new Error(`Failed to parse PDF compiler output: ${parseErr.message}`));
      }
    });

    pyProcess.stdin.write(payload);
    pyProcess.stdin.end();
  });
}

module.exports = {
  compilePdfBuffer,
  compile: (document_type, data) => compilePdfBuffer({ document_type, data }),
  compileVectorPdf: (params) => compilePdfBuffer({
    document_type: params.documentType || params.document_type,
    data: params.data,
  }),
};
