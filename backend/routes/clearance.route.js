const express = require("express");
const router = express.Router();
const {
  checkEligibility,
  checkCategoryStatus,
  initiateClearance,
  getActiveClearance,
  updateClearanceStep,
  finalizeClearance,
  cancelClearance,
  listClearances,
  getClearanceDetails,
  downloadClearancePdf,
} = require("../controllers/clearance.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles } = require("../middleware/authRole.js");

router.use(authMiddleware);

// 1. Eligibility & category status checks
router.post("/check-eligibility", checkEligibility);
router.post("/category-status", checkCategoryStatus);

// 2. Active clearance query (supports self, child for parent, or specific user for admin)
router.get("/active", getActiveClearance);

// 3. Admin dashboard tracking list
router.get("/list", authorizeRoles(["admin", "master_admin"]), listClearances);

// 4. Initiation & Step Management
router.post("/initiate", initiateClearance);
router.patch("/:id/step", updateClearanceStep);
router.post("/:id/finalize", finalizeClearance);
router.post("/:id/cancel", cancelClearance);

// 5. Details & Vector PDF Download
router.get("/:id", getClearanceDetails);
router.get("/:id/pdf", downloadClearancePdf);

module.exports = router;
