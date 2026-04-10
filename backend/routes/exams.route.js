const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const {
    createExam,
    getExams,
    recordExamResult,
    getExamResults
} = require("../controllers/exams.controller.js");

router.post("/", authMiddleware, createExam);
router.get("/", authMiddleware, getExams);

router.post("/results", authMiddleware, recordExamResult);
router.get("/results", authMiddleware, getExamResults);

module.exports = router;
