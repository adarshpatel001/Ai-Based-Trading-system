const bcrypt = require("bcryptjs");

const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const { generateToken } = require("../services/tokenService");

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    const error = new Error("name, email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    const error = new Error("Email already in use");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  await Wallet.create({ userId: user._id, balance: 1000000 });

  res.status(201).json({
    token: generateToken(user._id.toString()),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });

  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  res.json({
    token: generateToken(user._id.toString()),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

const me = asyncHandler(async (req, res) => {
  const wallet = await Wallet.findOne({ userId: req.user._id });

  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
    wallet: {
      balance: wallet?.balance ?? 0,
    },
  });
});

module.exports = { register, login, me };
