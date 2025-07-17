// routes/hrss/manpower.js
const express                   = require('express')
const router                    = express.Router()
const { authenticate }          = require('../../middlewares/authMiddleware')
const { authorizeCompanyAccess }= require('../../middlewares/roleMiddleware')
const { enforceCrudPermissions }= require('../../middlewares/crudPermissionMiddleware')
const manpowerController        = require('../../controllers/hrss/manpowerController')

// ────────────────────────────────────────────────────────────────────────────────
// All Manpower routes require a valid JWT and company context
router.use(authenticate)
router.use(authorizeCompanyAccess)

// ────────────────────────────────────────────────────────────────────────────────
// Fetch distinct list of all departments
// GET /api/hrss/manpower/departments
router.get('/departments', manpowerController.listDepartments)

// Fetch every department+position combination
// GET /api/hrss/manpower/list
router.get('/list', manpowerController.listDepartmentPositions)

// Fetch all targets (optionally filtered by ?yearMonth=YYYY-MM)
// GET /api/hrss/manpower/targets
router.get('/targets',manpowerController.getTargets)

// Create or update a single target
// POST /api/hrss/manpower/targets
router.post(
  '/targets', enforceCrudPermissions, manpowerController.createOrUpdateTarget)

// Fetch “actual vs target vs difference” summary for a month
// GET /api/hrss/manpower/summary?yearMonth=YYYY-MM
router.get('/summary', manpowerController.getMonthlyManpower)

module.exports = router
