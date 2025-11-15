//backend/routes/ta/roadmapRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../../controllers/ta/roadmapController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware');

// read
router.get('/', authenticate, authorizeCompanyAccess, controller.getRoadmaps);
router.get('/summary', authenticate, authorizeCompanyAccess, controller.getSummary);

// write
router.post('/', authenticate, authorizeCompanyAccess, enforceCrudPermissions, controller.createRoadmap);
router.put('/:id', authenticate, authorizeCompanyAccess, enforceCrudPermissions, controller.updateRoadmap);
router.delete('/:id', authenticate, authorizeCompanyAccess, enforceCrudPermissions, controller.deleteRoadmap);

module.exports = router;
