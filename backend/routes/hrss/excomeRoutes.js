// routes/hrss/excomeRoutes.js
const express = require('express')
const router  = express.Router()

const { authenticate }                  = require('../../middlewares/authMiddleware')
const { authorizeCompanyAccess }        = require('../../middlewares/roleMiddleware')
const {
  getMonthlyEmployeeCount,
  getManpowerTargets
} = require('../../controllers/hrss/excomeController')

// ─── Monthly Headcount by Employee Type ────────────────────────────────────────
// GET /api/excome/employee-count?month=YYYY-MM
router.get(
  '/employee-count',
  authenticate,
  authorizeCompanyAccess,
  getMonthlyEmployeeCount
)

// ─── Manpower Targets Summary by Category ──────────────────────────────────────
// GET /api/excome/manpower/targets?year=YYYY
router.get(
  '/manpower/targets',
  authenticate,
  authorizeCompanyAccess,
  getManpowerTargets
)

module.exports = router
