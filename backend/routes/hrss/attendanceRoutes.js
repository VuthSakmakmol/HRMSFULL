const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const {
  getAllAttendance,
  getDayShiftAttendance,
  getNightShiftAttendance,
  getPaginatedAttendance,
  importAttendance,
  updateAttendance,
  updateLeavePermission,
  deleteAttendance, 
} = require('../../controllers/hrss/attendanceController');

// 📥 Daily Attendance Import
router.post('/import', authenticate, authorizeCompanyAccess, importAttendance);

// ✅ Match frontend: /update-leave
router.post('/update-leave', authenticate, authorizeCompanyAccess, updateLeavePermission);

// 📄 Fetch All
router.get('/', authenticate, authorizeCompanyAccess, getAllAttendance);

// ☀️ Day Shift
router.get('/day', authenticate, authorizeCompanyAccess, getDayShiftAttendance);

// 🌙 Night Shift
router.get('/night', authenticate, authorizeCompanyAccess, getNightShiftAttendance);

// 📃 Paginated
router.get('/paginated', authenticate, authorizeCompanyAccess, getPaginatedAttendance);


// ✏️ Update Attendance Row (edit)
router.put('/:id', authenticate, authorizeCompanyAccess, updateAttendance);

router.delete('/:id', authenticate, authorizeCompanyAccess, deleteAttendance);

module.exports = router;
