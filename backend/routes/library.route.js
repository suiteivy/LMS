// routes/libraryRoutes.js
const express = require("express");

const {
  addOrUpdateBook,
  listBooks,
  borrowBook,
  returnBook,
  history,
  getAllBorrowedBooks,
  sendReminder,
  extendDueDate,
  updateBorrowStatus,
  rejectBorrowRequest,
} = require("../controllers/library.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authorizeRoles } = require("../middleware/authRole");

const router = express.Router();

// Admin: add/update book
router.post(
  "/books",
  authMiddleware,
  authorizeRoles(["admin"]),
  addOrUpdateBook
);

// Anyone (scoped by institution): list books
router.get("/books", authMiddleware, listBooks);

// Student: borrow
router.post(
  "/borrow",
  authMiddleware,
  authorizeRoles(["student"]),
  borrowBook
);

// Student/Admin: return
router.post(
  "/return/:bookId",
  authMiddleware,
  authorizeRoles(["student", "admin"]),
  returnBook
);

// History: admin can pass :studentId, student sees own if omitted
router.get("/history", authMiddleware, history);
router.get("/history/:studentId", authMiddleware, history);

// Admin/librarian: get all borrowed books (for overview)
router.get(
  "/borrowed",
  authMiddleware,
  authorizeRoles(["admin"]),
  getAllBorrowedBooks
);

// Admin/librarian: send reminder about overdue or soon-due book
router.post(
  "/reminder/:borrowId",
  authMiddleware,
  authorizeRoles(["admin"]),
  sendReminder
);

// Admin/librarian: extend a borrow due date
router.put(
  "/extend/:borrowId",
  authMiddleware,
  authorizeRoles(["admin"]),
  extendDueDate
);

// Admin/librarian: update borrow status
router.put(
  "/status/:borrowId",
  authMiddleware,
  authorizeRoles(["admin"]),
  updateBorrowStatus
);

// Admin/librarian: reject a borrow request
router.post(
  "/reject/:borrowId",
  authMiddleware,
  authorizeRoles(["admin"]),
  rejectBorrowRequest
);

module.exports = router;
