const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const {
  getAllAttendance,
  getDayShiftAttendance,
  getNightShiftAttendance,
  getPaginatedAttendance,
  importAttendance,
  updateAttendance 
} = require('../../controllers/hrss/attendanceController');

// 📥 Import attendance (protected)
router.post('/import', authenticate, importAttendance);

// 📄 Fetch all
router.get('/', authenticate, getAllAttendance);

// ☀️ Fetch Day Shift
router.get('/day', authenticate, getDayShiftAttendance);

// 🌙 Fetch Night Shift
router.get('/night', authenticate, getNightShiftAttendance);

// 📃 Pagination: ?page=1&limit=10
router.get('/paginate', authenticate, getPaginatedAttendance);


router.put('/:id', authenticate, updateAttendance);
module.exports = router;
