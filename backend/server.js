// File: /src/index.js

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./routes/auth.route");
const courseRoutes = require("./routes/courses.route");
const {
  institutionMiddleware,
} = require("./middleware/institutiona.middleware");

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", institutionMiddleware, courseRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`LMS Backend running on port ${PORT}`));
