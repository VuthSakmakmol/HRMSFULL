const express = require('express')
const router = express.Router()
const { importAttendance } = require('../../controllers/hrss/attendanceController')
const { authenticate } = require('../../middlewares/authMiddleware')

router.post('/import-attendance', authenticate, importAttendance)

module.exports = router
