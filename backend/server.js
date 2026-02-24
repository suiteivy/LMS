const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const authRoutes = require("./routes/auth.route");
const subjectRoutes = require("./routes/subjects.route");
const institutionRoutes = require("./routes/institution.route");
const libraryRoutes = require("./routes/library.route");
const bursaryRoutes = require("./routes/bursary.route");
const financeRoutes = require("./routes/finance.route");
const notificationRoutes = require("./routes/notification.route");
const settingsRoutes = require("./routes/settings.route");
const settingsController = require("./controllers/settings.controller");
const morgan = require("morgan");

const app = express();
app.use(express.json());

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Subscription Check Middleware (Trial Branch specific)
const checkSubscription = require("./middleware/subscriptionCheck");

// Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/demo", require("./routes/demo.route"));

// Gated Routes (Trial Branch)
app.use("/api/subjects", checkSubscription, subjectRoutes);
app.use("/api/institutions", checkSubscription, institutionRoutes);
app.use("/api/library", checkSubscription, libraryRoutes);
app.use("/api/bursary", checkSubscription, bursaryRoutes);
app.use("/api/finance", checkSubscription, financeRoutes);
app.use("/api/notifications", checkSubscription, notificationRoutes);
app.use("/api/timetable", checkSubscription, require("./routes/timetable.route"));
app.use("/api/funds", checkSubscription, require("./routes/finance_funds.route"));
app.use("/api/attendance", checkSubscription, require("./routes/attendance.route"));
app.use("/api/academic", checkSubscription, require("./routes/academic.route.js"));
app.use("/api/exams", checkSubscription, require("./routes/exams.route.js"));
app.use("/api/parent", checkSubscription, require("./routes/parent.route.js"));
app.use("/api/messages", checkSubscription, require("./routes/messaging.route.js"));
app.use("/api/resources", checkSubscription, require("./routes/resources.route.js"));
app.use("/api/teacher", checkSubscription, require("./routes/teacher.route.js"));
app.use("/api/settings", checkSubscription, settingsRoutes);
app.use("/api/student", checkSubscription, require("./routes/student.route"));
app.use("/api/classes", checkSubscription, require("./routes/class.route"));

// Automated background jobs (Trial Branch)
const { startTrialNudgesCron } = require('./cron/trialNudges');
if (typeof startTrialNudgesCron === 'function') {
  startTrialNudgesCron();
}

// health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "LMS API is running" });
});

// error handling
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}`);
  console.error("Error Details:", err.message);
  console.error("Stack:", err.stack);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Start server
const PORT = process.env.PORT || 4001;
const server = app.listen(PORT, () => {
  console.log(`LMS Backend running on http://localhost:${PORT}`);
  // Initialize dynamic currency rates check
  if (settingsController && typeof settingsController.checkAndAutoUpdateRates === 'function') {
    settingsController.checkAndAutoUpdateRates();
  }
});

// DEBUG: Keep process alive and log exit
setInterval(() => { }, 10000); // 10s keep-alive

process.on('exit', (code) => {
  console.log(`[DEBUG] Process exiting with code: ${code}`);
});

process.on('SIGTERM', () => {
  console.log('[DEBUG] SIGTERM received');
  server.close(() => {
    console.log('[DEBUG] Server closed');
  });
});
