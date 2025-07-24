const express = require('express')
const router = express.Router()

// Middlewares
const { authenticate } = require('../../../middlewares/authMiddleware')
const { authorizeCompanyAccess } = require('../../../middlewares/roleMiddleware')

// Controller
const {
  saveMonthlySnapshot,
  getEmployeeMonthlySnapshots
} = require('../../../controllers/hrss/excome/employeeMonthlyCountController')


// routes/hrss/excome/employeeMonthlyCountRoutes.js
router.post(
  '/employee-count/snapshot',
  authenticate,
  authorizeCompanyAccess,
  saveMonthlySnapshot
)


// 📊 Get snapshots for all 12 months of the given year
router.get(
  '/employee-snapshots',
  authenticate,
  authorizeCompanyAccess,
  getEmployeeMonthlySnapshots
)

module.exports = router
