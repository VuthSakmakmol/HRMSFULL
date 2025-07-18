const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/hrss/dashboardController');
const { authenticate } = require('../../middlewares/authMiddleware');

// 🧑‍🤝‍🧑 Total Employees
router.get('/employees', authenticate, dashboardController.getEmployeeSummary);

// 📈 Monthly Joins
router.get('/employees/monthly', authenticate, dashboardController.getMonthlyJoinChart);

// 🎯 Sewer & Jumper Monthly Breakdown
router.get('/employees/positions/monthly', authenticate, dashboardController.getPositionMonthlyCounts);


module.exports = router;
