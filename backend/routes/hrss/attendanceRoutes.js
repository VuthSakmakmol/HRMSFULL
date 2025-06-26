const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const {
  getAllAttendance,
  getDayShiftAttendance,
  getNightShiftAttendance,
  getPaginatedAttendance,
  importAttendance,
  updateAttendance,
  updateLeavePermission
} = require('../../controllers/hrss/attendanceController');

// 📥 Daily Attendance Import
router.post('/import', authenticate, importAttendance);

// ✅ Match frontend: /update-leave
router.post('/update-leave', authenticate, updateLeavePermission);

// 📄 Fetch All
router.get('/', authenticate, getAllAttendance);

// ☀️ Day Shift
router.get('/day', authenticate, getDayShiftAttendance);

// 🌙 Night Shift
router.get('/night', authenticate, getNightShiftAttendance);

// 📃 Paginated
router.get('/paginate', authenticate, getPaginatedAttendance);

// ✏️ Update Attendance Row (edit)
router.put('/:id', authenticate, updateAttendance);

module.exports = router;
