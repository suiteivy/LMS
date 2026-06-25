const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");
const {
    getGradingScales,
    createGradingScale,
    updateGradingScale,
    deleteGradingScale,
    bulkCreateGradingScale,
    getDefaultScale
} = require("../controllers/gradingScales.controller.js");

router.use(authMiddleware);

router.get("/", authorizeRoles(["admin", "teacher", "student", "parent"]), getGradingScales);
router.get("/default", authorizeRoles(["admin"]), getDefaultScale);
router.post("/", authorizeRoles(["admin", "teacher"]), createGradingScale);
router.put("/:id", authorizeRoles(["admin", "teacher"]), updateGradingScale);
router.delete("/:id", authorizeRoles(["admin", "teacher"]), deleteGradingScale);
router.post("/bulk", authorizeRoles(["admin", "teacher"]), bulkCreateGradingScale);

module.exports = router;
