const express = require('express');
const router = express.Router();
const dashboardController = require('../../controllers/ta/dashboardController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware');

router.post(
  '/stats',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions, // ✅ remember to allow POST as read in your middleware
  dashboardController.getDashboardStats
);

module.exports = router;
