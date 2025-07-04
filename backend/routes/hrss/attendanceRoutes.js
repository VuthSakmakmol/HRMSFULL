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
  getAttendanceById,
  getAttendanceHistoryByEmployeeId,
} = require('../../controllers/hrss/attendanceController');

// 📥 Import Attendance
router.post('/import', authenticate, authorizeCompanyAccess, importAttendance);

// ✅ Update Leave Permission
router.post('/update-leave', authenticate, authorizeCompanyAccess, updateLeavePermission);

// 📄 Fetch All Attendances
router.get('/', authenticate, authorizeCompanyAccess, getAllAttendance);

// ☀️ Fetch Day Shift Attendance
router.get('/day', authenticate, authorizeCompanyAccess, getDayShiftAttendance);

// 🌙 Fetch Night Shift Attendance
router.get('/night', authenticate, authorizeCompanyAccess, getNightShiftAttendance);

// 📃 Fetch Paginated Attendance
router.get('/paginated', authenticate, authorizeCompanyAccess, getPaginatedAttendance);

// 🆕 ✅ Get Single Attendance by Attendance ID (for EvaluatePage)
router.get('/attendances/:id', authenticate, authorizeCompanyAccess, getAttendanceById);

// 🆕 ✅ Get Full Attendance History by Employee ID (for EvaluatePage)
router.get('/history/:employeeId', authenticate, authorizeCompanyAccess, getAttendanceHistoryByEmployeeId);

// ✏️ Update Attendance Row (general edit)
router.put('/:id', authenticate, authorizeCompanyAccess, updateAttendance);

// 🗑️ Delete Attendance Row
router.delete('/:id', authenticate, authorizeCompanyAccess, deleteAttendance);




module.exports = router;
