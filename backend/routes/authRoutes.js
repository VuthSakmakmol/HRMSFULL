// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit'); // make sure you've run: npm i express-rate-limit
const authController = require('../controllers/authController'); // <-- one level up

// 5 attempts / minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, authController.login);

module.exports = router;
