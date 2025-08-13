const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.middleware");

const {
  listBooks,
  addOrUpdateBook,
  borrowBook,
  returnBook,
  borrowHistory,
} = require("../controllers/library.controller");

router.post("/books", authMiddleware, addOrUpdateBook); // admin only
router.get("/books", authMiddleware, listBooks); // all roles
router.post("/borrow", authMiddleware, borrowBook); // student
router.post("/return", authMiddleware, returnBook); // student/admin
router.get("/history/:studentId", authMiddleware, borrowHistory); // admin or self

module.exports = router;
