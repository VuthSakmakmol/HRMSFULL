const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  getMonthlyDepartmentSummary,
} = require('../../controllers/hrss/AttendanceDashboardController');

// 📊 Department-Level Attendance Summary (Monthly)
router.get(
  '/attendance/department-summary',
  authenticate,
  authorizeCompanyAccess,
  getMonthlyDepartmentSummary
);

module.exports = router;
