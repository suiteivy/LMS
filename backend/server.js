const process = require("node:process");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

// Global undici tuning for safer upstream networking behavior (Supabase/Auth)
try {
  const { Agent, setGlobalDispatcher } = require('undici');
  const connectTimeoutMs = Number(process.env.UNDICI_CONNECT_TIMEOUT_MS || 20000);
  const headersTimeoutMs = Number(process.env.UNDICI_HEADERS_TIMEOUT_MS || 30000);
  const bodyTimeoutMs = Number(process.env.UNDICI_BODY_TIMEOUT_MS || 30000);

  setGlobalDispatcher(
    new Agent({
      connect: { timeout: connectTimeoutMs },
      headersTimeout: headersTimeoutMs,
      bodyTimeout: bodyTimeoutMs,
      keepAliveTimeout: 30_000,
      keepAliveMaxTimeout: 120_000,
    })
  );
} catch (_e) {
  // no-op: keep startup resilient if undici API shape differs
}

// Security & Utility Middleware
const logger = require("./utils/logger.js");
const { rateLimiters } = require("./middleware/rateLimiter.js");

const authRoutes = require("./routes/auth.route.js");
const subjectRoutes = require("./routes/subjects.route.js");
const contactRoutes = require("./routes/contact.route.js");
const supportRoutes = require("./routes/support.route.js");
const demoRoutes = require("./routes/demo.route.js");
const institutionRoutes = require("./routes/institution.route.js");
const libraryRoutes = require("./routes/library.route.js");
const bursaryRoutes = require("./routes/bursary.route.js");
const financeRoutes = require("./routes/finance.route.js");
const notificationRoutes = require("./routes/notification.route.js");
const settingsRoutes = require("./routes/settings.route.js");
const masterAdminRoutes = require("./routes/master_admin.route.js");
const addonRequestRoutes = require("./routes/addon_request.routes.js");
const settingsController = require("./controllers/settings.controller.js");
const masterAdminController = require("./controllers/master_admin.controller.js");

const app = express();

// Trust proxy for correct IP detection behind reverse proxy
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const { nullStringSanitizer } = require("./middleware/sanitizer.middleware.js");
app.use(nullStringSanitizer);
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to public endpoints
app.use("/api/auth", rateLimiters.authPublic);

// Subscription Check Middleware (Trial Branch specific)
const { authMiddleware } = require("./middleware/auth.middleware.js");
const demoGuard = require("./middleware/demoGuard.js")
const checkSubscription = require("./middleware/subscriptionCheck.js");

const gated = [authMiddleware, demoGuard, checkSubscription]

// Public Routes
app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/demo", demoRoutes);
// Gated Routes (Trial Branch)
app.use("/api/subjects", authMiddleware, checkSubscription, subjectRoutes);
app.use("/api/roles", authMiddleware, checkSubscription, require("./routes/role.route.js"));
app.use("/api/institutions", authMiddleware, checkSubscription, institutionRoutes);
app.use("/api/library", authMiddleware, checkSubscription, libraryRoutes);
app.use("/api/bursary", authMiddleware, checkSubscription, bursaryRoutes);
app.use("/api/finance", authMiddleware, checkSubscription, financeRoutes);
app.use("/api/notifications", authMiddleware, checkSubscription, notificationRoutes);
app.use("/api/timetable", authMiddleware, checkSubscription, require("./routes/timetable.route.js"));
app.use("/api/funds", authMiddleware, checkSubscription, require("./routes/finance_funds.route.js"));
app.use("/api/attendance", authMiddleware, checkSubscription, require("./routes/attendance.route.js"));
app.use("/api/hours", authMiddleware, checkSubscription, require("./routes/hours.route.js"));
app.use("/api/academic", authMiddleware, checkSubscription, require("./routes/academic.route.js"));
app.use("/api/exams", authMiddleware, checkSubscription, require("./routes/exams.route.js"));
app.use("/api/parent", authMiddleware, checkSubscription, require("./routes/parent.route.js"));
app.use("/api/messages", authMiddleware, checkSubscription, require("./routes/messaging.route.js"));
app.use("/api/resources", authMiddleware, checkSubscription, require("./routes/resources.route.js"));
app.use("/api/teacher", authMiddleware, checkSubscription, require("./routes/teacher.route.js"));
app.use("/api/student", authMiddleware, checkSubscription, require("./routes/student.route.js"));
app.use("/api/classes", authMiddleware, checkSubscription, require("./routes/class.route.js"));
app.use("/api/diary", authMiddleware, checkSubscription, require("./routes/diary.route.js"));
app.use("/api/reports", authMiddleware, checkSubscription, require("./routes/reports.route.js"));
app.use("/api/assessment-types", authMiddleware, checkSubscription, require("./routes/assessmentTypes.route.js"));
app.use("/api/academic-years", authMiddleware, checkSubscription, require("./routes/academicYears.route.js"));
app.use("/api/grading-scales", authMiddleware, checkSubscription, require("./routes/gradingScales.route.js"));
app.use("/api/grade-entries", authMiddleware, checkSubscription, require("./routes/gradeEntries.route.js"));
app.use("/api/report-cards", authMiddleware, checkSubscription, require("./routes/reportCards.route.js"));
app.use("/api/promotions", authMiddleware, checkSubscription, require("./routes/promotion.route.js"));
app.use("/api/addon-requests", authMiddleware, addonRequestRoutes);

// Explicitly define currency route as public before using auth wrapper on settings
app.get('/api/settings/currencies', settingsController.getCurrencies);
app.get("/api/settings/currency", settingsController.getCurrencyRates);
app.get('/api/settings/maintenance', settingsController.getMaintenanceStatus);
app.use("/api/settings", authMiddleware, checkSubscription, settingsRoutes);

// Platform Admin Routes (Protected explicitly internally by requirePlatformAdmin)
app.use("/api/master-admin", authMiddleware, masterAdminRoutes);

// Automated background jobs
const { cleanupExpiredDemoSessions } = require('./services/demoCleanup.service.js');
const cron = require('node-cron');
const { retryScheduledNotificationDeliveries } = require('./services/notificationDelivery.service.js');
const { runUpcomingClassReminderSweepWithRetry } = require('./services/classReminder.service.js');
const { runFeeDeadlineReminderSweepWithRetry } = require('./services/feeDeadlineReminder.service.js');
const { pruneSystemActivityLogs } = require('./services/systemActivityLog.service.js');
const { recomputePreviousDayForInstitutionsFromAttendance } = require('./services/dailyHours.service.js');

// Notification retry worker: every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await retryScheduledNotificationDeliveries({ limit: 100 });
    if ((result?.processed || 0) > 0) {
      logger.info('Notification retry worker processed jobs', result);
    }
  } catch (error) {
    logger.error('Notification retry worker failed', { error: error?.message || String(error) });
  }
});

// Demo Cleanup: Runs every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  await cleanupExpiredDemoSessions();
});

// Class reminder worker: every 5 minutes (notify 10 minutes before class start)
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await runUpcomingClassReminderSweepWithRetry({
      leadMinutes: 10,
      windowMinutes: 5,
      attempts: 4,
      baseDelayMs: 1500,
    });
    if ((result?.queuedNotifications || 0) > 0) {
      logger.info('Class reminder worker queued notifications', result);
    }
  } catch (error) {
    logger.error('Class reminder worker failed', { error: error?.message || String(error) });
  }
});

// Fee deadline reminders: daily at 08:00 server time
cron.schedule('0 8 * * *', async () => {
  try {
    const result = await runFeeDeadlineReminderSweepWithRetry({
      attempts: 4,
      baseDelayMs: 1500,
    });
    if ((result?.queuedNotifications || 0) > 0) {
      logger.info('Fee deadline reminder worker queued notifications', result);
    }
  } catch (error) {
    logger.error('Fee deadline reminder worker failed', { error: error?.message || String(error) });
  }
});

// System activity log retention: every 6 hours (5-day retention)
cron.schedule('0 */6 * * *', async () => {
  try {
    const result = pruneSystemActivityLogs();
    if ((result?.pruned || 0) > 0) {
      logger.info('Pruned system activity logs', result);
    }
  } catch (error) {
    logger.error('System activity log prune failed', { error: error?.message || String(error) });
  }
});

// Daily hours eventual consistency: recompute previous day at 02:30 server time
cron.schedule('30 2 * * *', async () => {
  try {
    const result = await recomputePreviousDayForInstitutionsFromAttendance();
    if ((result?.institutions_processed || 0) > 0) {
      logger.info('Daily hours previous-day recompute completed', result);
    }
  } catch (error) {
    logger.error('Daily hours previous-day recompute failed', { error: error?.message || String(error) });
  }
});

// Password audit retention: every 6 hours (5-day retention)
cron.schedule('0 */6 * * *', async () => {
  try {
    const result = await masterAdminController.prunePasswordAuditLogs();
    if ((result?.pruned || 0) > 0) {
      logger.info('Pruned password audit logs', result);
    }
  } catch (error) {
    logger.error('Password audit log prune failed', { error: error?.message || String(error) });
  }
});

// Resolved support tickets retention: prune after 24h, hourly
cron.schedule('0 * * * *', async () => {
  try {
    const result = await masterAdminController.pruneResolvedSupportTickets();
    if ((result?.pruned || 0) > 0) {
      logger.info('Pruned resolved support tickets', result);
    }
  } catch (error) {
    logger.error('Support ticket prune failed', { error: error?.message || String(error) });
  }
});

// health check
app.get("/", (_req, res) => {
  res.status(200).json({ message: "LMS API is running" });
});

// Favicon handler - prevent 404/500 errors on favicon requests
app.get("/favicon.ico", (_req, res) => {
  res.status(204).end();
});

// Catch-all for undefined routes - must be after all valid routes
app.use((req, res) => {
  logger.warn('404 Not Found', { path: req.originalUrl, method: req.method, ip: req.ip });
  res.status(404).json({
    error: "The requested resource was not found.",
    code: "NOT_FOUND",
    path: req.originalUrl
  });
});

// Global error handler - catches all errors and returns generic messages
app.use((err, req, res, _next) => {
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

process.on('unhandledRejection', (reason, _p) => {
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
