// routes/hrss/excomeRoutes.js
const express                 = require('express')
const router                  = express.Router()

const { authenticate }        = require('../../middlewares/authMiddleware')
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware')
const {
  getManpowerTargets,
  getAverageAge,
  getAverageService,
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


module.exports = router
