/* ──────────────────────────────── Attendance Routes ──────────────────────────────── */

const express = require('express');
const router = express.Router();
const multer = require('multer');

// Multer setup — in-memory file buffer for Excel imports
const upload = multer(); // default: stores file in memory (req.file.buffer)

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

// Import controller functions
const {
  // Import / Upload
  importAttendance,

  // Core CRUD / Updates
  getAllAttendance,
  getPaginatedAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,

  // Leave and permissions
  updateLeavePermission,

  // Shift-specific (legacy)
  getDayShiftAttendance,
  getNightShiftAttendance,

  // Analytics / Summaries
  getAttendanceDotSummary,
  getAttendanceSeries,

  // Employee-level
  getAttendanceHistoryByEmployeeId,
} = require('../../controllers/hrss/attendanceController');

/* ──────────────────────────────── ROUTES ──────────────────────────────── */

// 📥 Import Attendance (Excel upload)
// POST /attendance/import
router.post(
  '/import',
  authenticate,
  authorizeCompanyAccess,
  upload.single('file'), // Enables multipart/form-data for Excel files
  importAttendance
);

// ✅ Update Leave Permission
// POST /attendance/update-leave
router.post(
  '/update-leave',
  authenticate,
  authorizeCompanyAccess,
  updateLeavePermission
);

// 📄 Fetch All Attendances
// GET /attendance?shiftTemplateId=&shiftName=&department=&line=&date=
router.get('/', authenticate, authorizeCompanyAccess, getAllAttendance);

// ☀️ Day Shift (LEGACY)
// GET /attendance/day
router.get('/day', authenticate, authorizeCompanyAccess, (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  return getDayShiftAttendance(req, res, next);
});

// 🌙 Night Shift (LEGACY)
// GET /attendance/night
router.get('/night', authenticate, authorizeCompanyAccess, (req, res, next) => {
  res.setHeader('Deprecation', 'true');
  return getNightShiftAttendance(req, res, next);
});

// 📃 Paginated Attendance
// GET /attendance/paginated?page=&limit=&shiftTemplateId=
router.get('/paginated', authenticate, authorizeCompanyAccess, getPaginatedAttendance);

// 🟩 GitHub-style Monthly Dot Summary
// GET /attendance/dots?year=&month=
router.get('/dots', authenticate, authorizeCompanyAccess, getAttendanceDotSummary);

// 📊 Time-series Analytics (used by AttendanceAnalytics.vue)
// GET /attendance/series?scope=day|month|year&date=YYYY-MM-DD&shiftTemplateId=
router.get('/series', authenticate, authorizeCompanyAccess, getAttendanceSeries);

// 🆕 Get Single Attendance by ID
// GET /attendance/attendances/:id
router.get('/attendances/:id', authenticate, authorizeCompanyAccess, getAttendanceById);

// 🆕 Get Full Attendance History of an Employee
// GET /attendance/history/:employeeId
router.get('/history/:employeeId', authenticate, authorizeCompanyAccess, getAttendanceHistoryByEmployeeId);

// ✏️ Update Attendance Record
// PUT /attendance/:id
router.put('/:id', authenticate, authorizeCompanyAccess, updateAttendance);

// 🗑️ Delete Attendance Record
// DELETE /attendance/:id
router.delete('/:id', authenticate, authorizeCompanyAccess, deleteAttendance);

/* ──────────────────────────────── EXPORT ──────────────────────────────── */
module.exports = router;
