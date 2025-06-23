const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/hrss/dashboardController');
const { authenticate } = require('../../middlewares/authMiddleware');

// 🧑‍🤝‍🧑 Total Employees
router.get('/employees', authenticate, dashboardController.getEmployeeSummary);

// 👥 Gender Breakdown
router.get('/employees/gender', authenticate, dashboardController.getGenderBreakdown);

// 📈 Monthly Joins
router.get('/employees/monthly', authenticate, dashboardController.getMonthlyJoinChart);

module.exports = router;
