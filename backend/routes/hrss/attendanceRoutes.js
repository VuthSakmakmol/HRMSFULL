// routes/hrss/attendanceRoutes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  getAllAttendance,
  getDayShiftAttendance,
  getNightShiftAttendance,
  getPaginatedAttendance,
  getAttendanceDotSummary,
  importAttendance,
  updateAttendance,
  updateLeavePermission,
  deleteAttendance,
  getAttendanceById,
  getAttendanceHistoryByEmployeeId,
  getAttendanceSeries,
} = require('../../controllers/hrss/attendanceController');

// 📥 Import Attendance (validate/commit supported by controller)
router.post('/import', authenticate, authorizeCompanyAccess, importAttendance);

// ✅ Update Leave Permission
router.post('/update-leave', authenticate, authorizeCompanyAccess, updateLeavePermission);

// 📄 Fetch All Attendances (with new filters: shiftTemplateId, shiftName, department, line, etc.)
router.get('/', authenticate, authorizeCompanyAccess, getAllAttendance);

// ☀️ Day Shift (LEGACY, use /?shiftName=Day Shift instead)
router.get('/day', authenticate, authorizeCompanyAccess, (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  return getDayShiftAttendance(req, res, next);
});

// 🌙 Night Shift (LEGACY, use /?shiftName=Night Shift instead)
router.get('/night', authenticate, authorizeCompanyAccess, (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  return getNightShiftAttendance(req, res, next);
});

// 📃 Paginated (with new filters: shiftTemplateId, shiftName)
router.get('/paginated', authenticate, authorizeCompanyAccess, getPaginatedAttendance);

// 🟩 GitHub-style monthly dots (Working / Missing / Holiday / Sunday)
router.get('/dots', authenticate, authorizeCompanyAccess, getAttendanceDotSummary);

// 📊 Time-series analytics (daily / monthly / yearly)
router.get('/series', authenticate, authorizeCompanyAccess, getAttendanceSeries);

// 🆕 Get Single Attendance by ID (used by Evaluate page)
router.get('/attendances/:id', authenticate, authorizeCompanyAccess, getAttendanceById);

// 🆕 Full Attendance History by Employee ID
router.get('/history/:employeeId', authenticate, authorizeCompanyAccess, getAttendanceHistoryByEmployeeId);

// ✏️ Update Attendance row
router.put('/:id', authenticate, authorizeCompanyAccess, updateAttendance);

// 🗑️ Delete Attendance row
router.delete('/:id', authenticate, authorizeCompanyAccess, deleteAttendance);

module.exports = router;
