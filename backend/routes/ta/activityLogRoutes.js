const express = require('express');
const router = express.Router();
const {
  getAllLogs,
  restoreDeleted
} = require('../../controllers/ta/activityLogController');
const { authenticate } = require('../../middlewares/authMiddleware');

// 🔐 GM-only: get full logs
router.get('/', authenticate, getAllLogs);

// 🔁 Restore a deleted document by log ID
router.post('/restore/:logId', authenticate, restoreDeleted);

module.exports = router;
