const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  getAllAttendance,
  getDayShiftAttendance,
  getNightShiftAttendance,
  getPaginatedAttendance,
  getAttendanceDotSummary,   // ⬅️ NEW
  importAttendance,
  updateAttendance,
  updateLeavePermission,
  deleteAttendance,
  getAttendanceById,
  getAttendanceHistoryByEmployeeId,
} = require('../../controllers/hrss/attendanceController');

// 📥 Import Attendance (validate/commit supported by controller)
router.post('/import', authenticate, authorizeCompanyAccess, importAttendance);

// ✅ Update Leave Permission
router.post('/update-leave', authenticate, authorizeCompanyAccess, updateLeavePermission);

// 📄 Fetch All Attendances
router.get('/', authenticate, authorizeCompanyAccess, getAllAttendance);

// ☀️ Day Shift
router.get('/day', authenticate, authorizeCompanyAccess, getDayShiftAttendance);

// 🌙 Night Shift
router.get('/night', authenticate, authorizeCompanyAccess, getNightShiftAttendance);

// 📃 Paginated
router.get('/paginated', authenticate, authorizeCompanyAccess, getPaginatedAttendance);

// 🟩 GitHub-style monthly dots (Working / Missing / Holiday / Sunday)
router.get('/dots', authenticate, authorizeCompanyAccess, getAttendanceDotSummary);

// 🆕 Get Single Attendance by ID (used by Evaluate page)
router.get('/attendances/:id', authenticate, authorizeCompanyAccess, getAttendanceById);

// 🆕 Full Attendance History by Employee ID
router.get('/history/:employeeId', authenticate, authorizeCompanyAccess, getAttendanceHistoryByEmployeeId);

// ✏️ Update Attendance row
router.put('/:id', authenticate, authorizeCompanyAccess, updateAttendance);

// 🗑️ Delete Attendance row
router.delete('/:id', authenticate, authorizeCompanyAccess, deleteAttendance);

module.exports = router;
