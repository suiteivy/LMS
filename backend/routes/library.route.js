// routes/library.route.js
const express = require("express");

const {
  addOrUpdateBook,
  listBooks,
  borrowBook,
  returnBook,
  history,
  getAllBorrowedBooks,
  extendDueDate,
  updateBorrowStatus,
  rejectBorrowRequest,
  sendReminder,
  deleteBook,
  issueBook,
  getLibrariansList,
  toggleLibrarianDesignation,
  getLibrarianAuditLogs,
  getMyDesignation
} = require("../controllers/library.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authorizeRoles, authorizeLibrarian, authorizeMainAdmin } = require("../middleware/authRole.js");

const router = express.Router();

// Book catalog management: Main Admin & designated Librarians
router.post(
  "/books",
  authMiddleware,
  authorizeLibrarian(),
  addOrUpdateBook
);

router.put(
  "/books/:bookId",
  authMiddleware,
  authorizeLibrarian(),
  addOrUpdateBook
);

router.delete(
  "/books/:bookId",
  authMiddleware,
  authorizeLibrarian(),
  deleteBook
);

// Anyone (scoped by institution): list books (read-only)
router.get("/books", authMiddleware, listBooks);

// Self-service borrow: strictly disabled (returns 403)
router.post(
  "/borrow",
  authMiddleware,
  borrowBook
);

// In-person checkout: Librarian / Main Admin only
router.post(
  "/issue",
  authMiddleware,
  authorizeLibrarian(),
  issueBook
);

// In-person return: Librarian / Main Admin only
router.post(
  "/return/:borrowId",
  authMiddleware,
  authorizeLibrarian(),
  returnBook
);

// Circulation overview with filters: Librarian / Main Admin only
router.get(
  "/borrowed",
  authMiddleware,
  authorizeLibrarian(),
  getAllBorrowedBooks
);

// Loan management: extend, update status, reject, remind
router.put(
  "/extend/:borrowId",
  authMiddleware,
  authorizeLibrarian(),
  extendDueDate
);

router.put(
  "/status/:borrowId",
  authMiddleware,
  authorizeLibrarian(),
  updateBorrowStatus
);

router.post(
  "/reminder/:borrowId",
  authMiddleware,
  authorizeLibrarian(),
  sendReminder
);

router.post(
  "/reject/:borrowId",
  authMiddleware,
  authorizeLibrarian(),
  rejectBorrowRequest
);

// History: students & teachers see own; librarians/admins can see specific student
router.get("/history", authMiddleware, history);
router.get("/history/:studentId", authMiddleware, history);

// Librarian designation management: Main Admin only
router.get(
  "/librarians",
  authMiddleware,
  authorizeMainAdmin(),
  getLibrariansList
);

router.post(
  "/librarians/toggle",
  authMiddleware,
  authorizeMainAdmin(),
  toggleLibrarianDesignation
);

// Librarian audit logs: Librarians and Admins
router.get(
  "/librarians/audit",
  authMiddleware,
  authorizeLibrarian(),
  getLibrarianAuditLogs
);

// Current user's designation status
router.get(
  "/me/designation",
  authMiddleware,
  getMyDesignation
);

module.exports = router;
