//backend/routes/ta/reportRoutes.js
const express = require('express');
const router = express.Router();
const { getReport } = require('../../controllers/ta/reportController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

router.get(
  '/',
  authenticate,
  authorizeCompanyAccess,
  getReport
);

module.exports = router;
