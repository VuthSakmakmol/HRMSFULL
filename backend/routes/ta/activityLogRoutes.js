const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const { getAllLogs, restoreDeleted } = require('../../controllers/ta/activityLogController');

// GM-only
router.get('/', authenticate, getAllLogs);
router.post('/restore/:logId', authenticate, restoreDeleted);

module.exports = router;
