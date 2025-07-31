// File: /src/index.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.route");
const courseRoutes = require("./routes/courses.route");
const institutionRoutes = require("./routes/institution.route");

const app = express();
dotenv.config();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// logging
app.use(morgan("dev"));

// handle cors
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", [
    "http://localhost:3000",
    "https://your-production-url.com",
    "http://localhost:5173",
  ]);
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
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/institutions", institutionRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`LMS Backend running on http://localhost:${PORT}`)
);
