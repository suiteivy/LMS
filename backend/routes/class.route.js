const express = require("express");
const router = express.Router();
const {
    createClass,
    updateClass,
    deleteClass,
    getClasses,
    getClassStudents,
    enrollStudent,
    removeStudent,
    autoAssignStudents,
} = require("../controllers/class.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

// Inline admin-only middleware
const adminOnly = (req, res, next) => {
    if (req.userRole !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};

// All routes require authentication + admin role
router.use(authMiddleware);
router.use(adminOnly);

router.get("/", getClasses);
router.post("/", createClass);
router.post("/auto-assign", autoAssignStudents);

router.put("/:id", updateClass);
router.delete("/:id", deleteClass);
router.get("/:id/students", getClassStudents);
router.post("/:id/enroll", enrollStudent);
router.delete("/:id/students/:studentId", removeStudent);

module.exports = router;
