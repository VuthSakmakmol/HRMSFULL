const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // default: stores file in memory (req.file.buffer)

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

/* ──────────────────────────────── ROUTES ──────────────────────────────── */

// 📥 Import Attendance (validate/commit, supports file upload)
router.post(
  '/import',
  authenticate,
  authorizeCompanyAccess,
  upload.single('file'),        // <-- ✅ enables multipart/form-data support
  importAttendance
);

// ✅ Update Leave Permission
router.post('/update-leave', authenticate, authorizeCompanyAccess, updateLeavePermission);

// 📄 Fetch All Attendances (with filters: shiftTemplateId, shiftName, department, line, etc.)
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

// 📃 Paginated (with filters: shiftTemplateId, shiftName)
router.get('/paginated', authenticate, authorizeCompanyAccess, getPaginatedAttendance);

// 🟩 GitHub-style monthly dots
router.get('/dots', authenticate, authorizeCompanyAccess, getAttendanceDotSummary);

// 📊 Time-series analytics
router.get('/series', authenticate, authorizeCompanyAccess, getAttendanceSeries);

// 🆕 Get Single Attendance by ID
router.get('/attendances/:id', authenticate, authorizeCompanyAccess, getAttendanceById);

// 🆕 Full Attendance History by Employee ID
router.get('/history/:employeeId', authenticate, authorizeCompanyAccess, getAttendanceHistoryByEmployeeId);

// ✏️ Update Attendance
router.put('/:id', authenticate, authorizeCompanyAccess, updateAttendance);

// 🗑️ Delete Attendance
router.delete('/:id', authenticate, authorizeCompanyAccess, deleteAttendance);

module.exports = router;
