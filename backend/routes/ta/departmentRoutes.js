//backend/routes/ta/departmentRoutes.js
const express = require('express');
const router = express.Router();

const {
  getAll,
  getById,
  create,
  update,
  remove,
  removeJobTitles
} = require('../../controllers/ta/departmentController');

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware');

// LIST
router.get(
  '/departments',
  authenticate,
  authorizeCompanyAccess,
  getAll
);

// GET ONE
router.get(
  '/departments/:id',
  authenticate,
  authorizeCompanyAccess,
  getById
);

// CREATE
router.post(
  '/departments',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  create
);

// UPDATE
router.put(
  '/departments/:id',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  update
);

// DELETE
router.delete(
  '/departments/:id',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  remove
);

// REMOVE JOB TITLES
router.put(
  '/departments/:id/remove-job-titles',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  removeJobTitles
);

module.exports = router;
