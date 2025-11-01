const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const C = require('../../controllers/hrss/attendanceReportController');

// 📊 Daily Attendance Matrix
router.get('/daily', authenticate, authorizeCompanyAccess, C.getDailyAttendanceReport);

module.exports = router;
