require("dotenv").config();
const express = require("express");
const cors = require("cors");

const userRoutes = require("./src/routes/user.route");
const businessRoutes = require("./src/routes/business.route");
const investmentRoutes = require("./src/routes/investment.route");

const { generalLimiter } = require("./src/middleware/rateLimiter");
const { errorHandler } = require("./src/middleware/error");
const { NotFoundError } = require("./src/utils/error"); // <-- FIXED PATH

const app = express();

// --- CORS ---
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:5173").split(","),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    optionsSuccessStatus: 200,
  })
);

// --- Body parsers ---
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// --- Rate limiter ---
app.use("/api", generalLimiter);

// --- Routes ---
app.use("/api", userRoutes);
app.use("/api", businessRoutes);
app.use("/api", investmentRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

// --- 404 + centralized error handler (must be LAST) ---
app.use((req, res, next) =>
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`))
);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});