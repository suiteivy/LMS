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
  const origin = req.headers.origin;
  if (["http://localhost:3000", "http://localhost:5173"].includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    return res.status(200).json({});
  }
  next();
});

// Routes
app.use("/api/auth", authRoutes); // Auth shouldn't be fully blocked, but register handles it

// Apply Subscription Check Middleware to Protected Routes
const checkSubscription = require("./middleware/subscriptionCheck");

app.use("/api/subjects", checkSubscription, subjectRoutes);
app.use("/api/institutions", checkSubscription, institutionRoutes);
app.use("/api/library", checkSubscription, libraryRoutes);
app.use("/api/bursary", checkSubscription, bursaryRoutes);
app.use("/api/finance", checkSubscription, financeRoutes);
app.use("/api/notifications", checkSubscription, notificationRoutes);
app.use("/api/timetable", checkSubscription, require("./routes/timetable.route"));
app.use("/api/funds", checkSubscription, require("./routes/finance_funds.route"));
app.use("/api/attendance", checkSubscription, require("./routes/attendance.route"));

// automated background jobs
const { startTrialNudgesCron } = require('./cron/trialNudges');
startTrialNudgesCron();

// health check
app.get("/", (req, res) => {
  res.status(200).json({ message: "LMS API is running" });
});

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, p) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Start server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () =>
  console.log(`LMS Backend running on http://localhost:${PORT}`)
);
