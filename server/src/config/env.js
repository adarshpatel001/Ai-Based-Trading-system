const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/trading_sim",
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://127.0.0.1:8001",
  marketServiceUrl: process.env.MARKET_SERVICE_URL || "http://127.0.0.1:8000",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
