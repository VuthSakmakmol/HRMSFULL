// routes/hrss/excomeRoutes.js
const express                 = require('express')
const router                  = express.Router()

const { authenticate }        = require('../../middlewares/authMiddleware')
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware')
const {
  getManpowerTargets,
  getAverageAge,
  getAverageService,
  getMonthlyResignReasonDirectStats,
  getMonthlyResignReasonIndirectStats,
  getResignReasonDirectLabor,
  getResignReasonIndirectLabor,
  getPeriodOfDirectLaborResignByYear,
  getPeriodOfIndirectLaborResignByYear,
  getPeriodOfDirectLaborChartResignByYear,
  getPeriodOfIndirectLaborChartResignByYear,
  getDirectLaborInAndOutByMonth
  
} = require('../../controllers/hrss/excomeController')



// ─── Manpower Targets Summary by Category ──────────────────────────────────────
// GET /api/excome/manpower/targets?year=YYYY
router.get(
  '/manpower/targets',
  authenticate,
  authorizeCompanyAccess,
  getManpowerTargets
)

// ─── Average Age Metrics ───────────────────────────────────────────────────────
// GET /api/excome/employee-age
router.get(
  '/employee-age',
  authenticate,
  authorizeCompanyAccess,
  getAverageAge
)

// ─── Average Years of Service ──────────────────────────────────────────────────
// GET /api/excome/employee-service
router.get(
  '/employee-service',
  authenticate,
  authorizeCompanyAccess,
  getAverageService
)

// ─── Monthly Resign Reason Summary ────────────────────────────────

// Route
router.get(
  '/resign-reason-summary',
  authenticate,
  authorizeCompanyAccess,
  getMonthlyResignReasonDirectStats
)

router.get(
  '/resign-reason-indirect-summary',
  authenticate,
  authorizeCompanyAccess,
  getMonthlyResignReasonIndirectStats
)


router.get(
  '/resign-reason-direct-labor',
  authenticate,
  authorizeCompanyAccess,
  getResignReasonDirectLabor
)

router.get(
  '/resign-reason-indirect-labor',
  authenticate,
  authorizeCompanyAccess,
  getResignReasonIndirectLabor
)

router.get(
  '/period-of-direct-resign',
  authenticate,
  authorizeCompanyAccess,
  getPeriodOfDirectLaborResignByYear
)

// Indirect Labor Period of Resignation
router.get(
  '/period-of-indirect-resign',
  authenticate,
  authorizeCompanyAccess,
  getPeriodOfIndirectLaborResignByYear
)

router.get(
  '/period-of-direct-chart-resign',
  authenticate,
  authorizeCompanyAccess,
  getPeriodOfDirectLaborChartResignByYear
)

router.get(
  '/period-of-indirect-chart-resign',
  authenticate,
  authorizeCompanyAccess,
  getPeriodOfIndirectLaborChartResignByYear
)


// GET /api/excome/direct-labor-in-out?year=YYYY
router.get(
  '/direct-labor-in-out',
  authenticate,
  authorizeCompanyAccess,
  getDirectLaborInAndOutByMonth
)

module.exports = router
