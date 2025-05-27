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

router.get('/job-requisitions', authenticate, getJobRequisitions);
router.post('/job-requisitions', authenticate, createJobRequisition);
router.get('/job-requisitions/job-titles', authenticate, getAllJobTitles);

module.exports = router;
