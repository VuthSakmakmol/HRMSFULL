const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../middlewares/authMiddleware')
const { authorizeCompanyAccess } = require('../../../middlewares/roleMiddleware')

const {
  saveMonthlySnapshot,
  getEmployeeMonthlySnapshots
} = require('../../../controllers/hrss/excome/employeeMonthlyCountController')

router.post('/employee-count/snapshot', authenticate, authorizeCompanyAccess, saveMonthlySnapshot)
router.get('/employee-snapshots', authenticate, authorizeCompanyAccess, getEmployeeMonthlySnapshots)

module.exports = router
