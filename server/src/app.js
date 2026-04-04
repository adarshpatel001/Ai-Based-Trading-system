const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const { clientOrigin } = require("./config/env");
const { notFoundHandler, errorHandler } = require("./middleware/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const marketRoutes = require("./routes/marketRoutes");
const tradeRoutes = require("./routes/tradeRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const allowedOrigins = [
  clientOrigin,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "trading-sim-server" });
});

app.use("/api/auth", authRoutes);
app.use("/api/market", marketRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/ai", aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
