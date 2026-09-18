const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { compilePdf, compilePdfBase64 } = require("../controllers/pdf.controller.js");

router.use(authMiddleware);

router.post("/compile", compilePdf);
router.post("/compile-base64", compilePdfBase64);

module.exports = router;
