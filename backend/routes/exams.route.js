const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");
const {
    createExam,
    getExams,
    recordExamResult,
    getExamResults
} = require("../controllers/exams.controller");

router.post("/", authMiddleware, createExam);
router.get("/", authMiddleware, getExams);

router.post("/results", authMiddleware, recordExamResult);
router.get("/results", authMiddleware, getExamResults);

module.exports = router;
