const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  getMonthlyDepartmentSummary,
  getIndirectAndMerchandisingSummary,
  getMonthlyDirectAbsentRateCompare,
  updateTarget
} = require('../../controllers/hrss/AttendanceDashboardController');

// 📊 Department-Level Attendance Summary (Monthly)
router.get(
  '/attendance/department-summary',
  authenticate,
  authorizeCompanyAccess,
  getMonthlyDepartmentSummary
);


router.get(
  '/attendance/indirect-summary', 
  authenticate, 
  authorizeCompanyAccess, 
  getIndirectAndMerchandisingSummary)


router.get(
  '/attendance/direct-absent-rate-compare',
  authenticate,
  authorizeCompanyAccess,
  getMonthlyDirectAbsentRateCompare
)

router.post(
  '/attendance/update-target',
  authenticate,
  authorizeCompanyAccess,
  updateTarget
)
  
module.exports = router;
