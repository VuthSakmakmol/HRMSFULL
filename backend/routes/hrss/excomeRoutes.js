const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess, authorize } = require('../../middlewares/roleMiddleware');
const { getMonthlyEmployeeCount } = require('../../controllers/hrss/excomeController');

// ────────────────────────────────────────────────────────────────────────────────
// Monthly Headcount by Employee Type
// GET /api/excome/employee-count?month=YYYY-MM
// Accessible by authenticated users with company context

router.get(
  '/employee-count',
  authenticate,
  authorizeCompanyAccess,
  // Optionally restrict roles: e.g., only HR or Managers
  // authorize(['GeneralManager', 'Manager', 'HR']),
  getMonthlyEmployeeCount
);

module.exports = router;
