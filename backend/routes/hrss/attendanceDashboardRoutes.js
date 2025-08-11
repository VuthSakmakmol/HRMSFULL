const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  getMonthlyDepartmentSummary,
  getIndirectAndMerchandisingSummary,
  getMonthlyDirectAbsentRateCompare,
  updateTarget,

  // TurnOver rate
  getMonthlyDirectLaborTurnoverRate,
  getTurnoverTarget,
  updateTurnoverTarget
} = require('../../controllers/hrss/AttendanceDashboardController');

// 📊 Department-Level Attendance Summary (Monthly)
router.get('/attendance/department-summary',
  authenticate, authorizeCompanyAccess, getMonthlyDepartmentSummary);

router.get('/attendance/indirect-summary',
  authenticate, authorizeCompanyAccess, getIndirectAndMerchandisingSummary);

router.get('/attendance/direct-absent-rate-compare',
  authenticate, authorizeCompanyAccess, getMonthlyDirectAbsentRateCompare);

router.post('/attendance/update-target',
  authenticate, authorizeCompanyAccess, updateTarget);

// 📈 Turnover: Direct Labor
router.get('/turnover/direct-labor',
  authenticate, authorizeCompanyAccess, getMonthlyDirectLaborTurnoverRate);

router.get('/turnover/target',
  authenticate, authorizeCompanyAccess, getTurnoverTarget);

// 🔧 FIX: use PUT to match the frontend
router.put('/turnover/target',
  authenticate, authorizeCompanyAccess, updateTurnoverTarget);

module.exports = router;
