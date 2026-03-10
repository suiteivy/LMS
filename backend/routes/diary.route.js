const express = require("express");
const router = express.Router();
const controller = require("../controllers/diary.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const checkSubscription = require("../middleware/subscriptionCheck");

router.use(authMiddleware);
router.use(checkSubscription);

router.post("/", controller.createEntry);
router.get("/", controller.getEntries);
router.put("/:id", controller.updateEntry);
router.delete("/:id", controller.deleteEntry);

module.exports = router;
