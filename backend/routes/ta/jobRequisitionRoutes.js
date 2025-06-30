const express = require('express');
const router = express.Router();

const {
  getJobRequisitions,
  createJobRequisition,
  deleteJobRequisition,
  updateJobRequisition,
  getAllJobTitles,
  getVacantRequisitions
} = require('../../controllers/ta/jobRequisitionController');

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware'); // ✅ IMPORTED

// ─── Job Requisition CRUD ────────────────────────────────
router.get(
  '/job-requisitions',
  authenticate,
  authorizeCompanyAccess,
  getJobRequisitions
);

router.post(
  '/job-requisitions',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions, // ✅ Enforce role-based CRUD permissions
  createJobRequisition
);

router.put(
  '/job-requisitions/:id',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions, // ✅ Enforce CRUD permissions
  updateJobRequisition
);

router.delete(
  '/job-requisitions/:id',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions, // ✅ Enforce CRUD permissions
  deleteJobRequisition
);

// ─── Helper Endpoints ────────────────────────────────────
router.get(
  '/job-requisitions/job-titles',
  authenticate,
  authorizeCompanyAccess,
  getAllJobTitles
);

router.get(
  '/job-requisitions/vacant',
  authenticate,
  authorizeCompanyAccess,
  getVacantRequisitions
);

module.exports = router;
