const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

// Security & Utility Middleware
const logger = require("./utils/logger");
const { rateLimiters } = require("./middleware/rateLimiter");

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

// Trust proxy for correct IP detection behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom morgan token for logging
morgan.token('remote-addr', (req) => req.ip || req.connection.remoteAddress);
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim(), { type: 'access' }) }
}));

// Apply rate limiting to public endpoints
app.use("/api/auth", rateLimiters.auth);
app.use("/api/auth/forgot-password", rateLimiters.passwordReset);
app.use("/api/auth/reset-password", rateLimiters.passwordReset);

// Subscription Check Middleware (Trial Branch specific)
const checkSubscription = require("./middleware/subscriptionCheck");

// Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/demo", require("./routes/demo.route"));
app.use("/api/contact", require("./routes/contact.route"));
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

// Global error handler - catches all errors and returns generic messages
app.use((err, req, res, next) => {
  logger.error('Unhandled error in request', {
    method: req.method,
    path: req.url,
    error: err,
    ip: req.ip
  });

  // Return generic message to client - don't expose internal details
  res.status(500).json({
    error: "An unexpected error occurred. Please try again later.",
    code: "INTERNAL_ERROR"
  });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err, stack: err.stack });
});

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

// Start server — bind to 0.0.0.0 so physical devices and Android emulators
// on the same LAN can reach the backend (not just localhost).
const PORT = process.env.PORT || 4001;
const server = app.listen(PORT, "0.0.0.0", () => {
  const { networkInterfaces } = require("os");
  const nets = networkInterfaces();
  const lanIp = Object.values(nets).flat().find(
    (n) => n?.family === "IPv4" && !n.internal
  )?.address || "unknown";

  logger.info('LMS Backend started', { port: PORT, lanIp });
  console.log(`LMS Backend running on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${lanIp}:${PORT}  ← use this for physical devices`);

  // Initialize dynamic currency rates check
  if (settingsController && typeof settingsController.checkAndAutoUpdateRates === 'function') {
    settingsController.checkAndAutoUpdateRates();
  }
});

// DEBUG: Keep process alive
setInterval(() => { }, 10000); // 10s keep-alive

process.on('exit', (code) => {
  logger.info('Process exiting', { code });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server');
  server.close(() => {
    logger.info('Server closed');
  });
});
