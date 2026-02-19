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
// dotenv.config() removed from here

// Middleware
app.use(cors()); //cors
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // logging

// handle cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    return res.status(200).json({});
  }
  next();
});

// Request Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes); // Updated endpoint
app.use("/api/institutions", institutionRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/bursary", bursaryRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/timetable", require("./routes/timetable.route"));
app.use("/api/funds", require("./routes/finance_funds.route"));
app.use("/api/attendance", require("./routes/attendance.route"));
app.use("/api/academic", require("./routes/academic.route.js"));
app.use("/api/exams", require("./routes/exams.route.js"));
app.use("/api/parent", require("./routes/parent.route.js"));
app.use("/api/messages", require("./routes/messaging.route.js"));
app.use("/api/resources", require("./routes/resources.route.js"));
app.use("/api/teacher", require("./routes/teacher.route.js"));
app.use("/api/settings", settingsRoutes);
app.use("/api/trials", require("./routes/trial.route"));
app.use("/api/student", require("./routes/student.route"));

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
  settingsController.checkAndAutoUpdateRates();
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
