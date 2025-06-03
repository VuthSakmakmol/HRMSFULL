const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/ta/dashboardController');
const { authenticate } = require('../../middlewares/authMiddleware'); // ✅ fix here

router.post('/stats', authenticate, dashboardController.getDashboardStats);

module.exports = router;
