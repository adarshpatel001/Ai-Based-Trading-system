const mongoose = require("mongoose");
const { mongoUri } = require("./env");

async function connectDb() {
  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}

module.exports = { connectDb };
