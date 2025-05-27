const express = require('express');
const router = express.Router();
const controller = require('../../controllers/ta/jobRequisitionController');

router.get('/', controller.getJobRequisitions);
router.get('/job-titles', controller.getAllJobTitles);
router.post('/', controller.createJobRequisition);
router.put('/:id', controller.updateJobRequisition);
router.delete('/:id', controller.deleteJobRequisition);

module.exports = router;
