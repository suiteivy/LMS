const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    getReportCards,
    getReportCard,
    generateStudentReportCard,
    generateClassReportCards,
    updateReportCardRemarks,
    publishReportCard,
    bulkPublishReportCards,
    releaseReportCard,
    bulkReleaseReportCards,
    checkCompleteness,
    getReportCardSummary,
    exportReportCardPDF
} = require("../controllers/reportCards.controller.js");

router.use(authMiddleware);

router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getReportCards);
router.get("/summary", authorizeRoles(["admin", "teacher"]), getReportCardSummary);
router.get("/completeness", authorizeRoles(["admin", "teacher"]), checkCompleteness);
router.get("/export/pdf", authorizeRoles(["admin", "teacher", "student", "parent"]), exportReportCardPDF);
router.get("/:id", authorizeRoles(["admin", "teacher", "student", "parent"]), getReportCard);

router.post("/generate", authorizeRoles(["admin"]), generateStudentReportCard);
router.post("/generate-class", authorizeRoles(["admin"]), generateClassReportCards);
router.put("/:id/remarks", authorizeRoles(["admin", "teacher"]), updateReportCardRemarks);
router.put("/:id/publish", authorizeRoles(["admin"]), publishReportCard);
router.post("/bulk-publish", authorizeRoles(["admin"]), bulkPublishReportCards);
router.put("/:id/release", authorizeRoles(["admin"]), releaseReportCard);
router.post("/bulk-release", authorizeRoles(["admin"]), bulkReleaseReportCards);

module.exports = router;
