// routes/libraryRoutes.js
const express = require("express");

const {
  addOrUpdateBook,
  listBooks,
  borrowBook,
  returnBook,
  history,
} = require("../controllers/library.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

// Admin: add/update book
router.post("/books", authMiddleware, addOrUpdateBook);

// Anyone (scoped by institution): list books
router.get("/books", authMiddleware, listBooks);

// Student: borrow
router.post("/borrow/:bookId", authMiddleware, borrowBook);

// Student/Admin: return
router.post("/return/:bookId", authMiddleware, returnBook);

// History: admin can pass :studentId, student sees own if omitted
router.get("/history/:studentId", authMiddleware, history);

module.exports = router;
