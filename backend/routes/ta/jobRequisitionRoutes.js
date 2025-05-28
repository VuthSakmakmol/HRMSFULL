const express = require('express');
const router = express.Router();

const {
  getJobRequisitions,
  createJobRequisition,
  deleteJobRequisition,
  updateJobRequisition,
  getAllJobTitles
} = require('../../controllers/ta/jobRequisitionController');

const { authenticate } = require('../../middlewares/authMiddleware'); // ✅ correct path

// ─── Job Requisition CRUD ─────────────────────────────────────────────
router.get('/job-requisitions', authenticate, getJobRequisitions);              // ✅ Read all
router.post('/job-requisitions', authenticate, createJobRequisition);           // ✅ Create
router.put('/job-requisitions/:id', authenticate, updateJobRequisition);        // ✅ Update
router.delete('/job-requisitions/:id', authenticate, deleteJobRequisition);     // ✅ Delete

// ─── Helper Endpoint ──────────────────────────────────────────────────
router.get('/job-requisitions/job-titles', authenticate, getAllJobTitles);      // ✅ For dropdown

module.exports = router;
