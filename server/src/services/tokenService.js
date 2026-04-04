const jwt = require("jsonwebtoken");
const { jwtSecret, jwtExpiresIn } = require("../config/env");

function generateToken(userId) {
  return jwt.sign({ userId }, jwtSecret, { expiresIn: jwtExpiresIn });
}

module.exports = { generateToken };
