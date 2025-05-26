const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const departmentController = require('../controllers/ta/departmentController');
const jobRequisitionController = require('../controllers/ta/jobRequisitionController');
const candidateController = require('../controllers/ta/candidateController');
const upload = require('../middlewares/uploadMiddleware');



// Department routes
router.get('/departments', authenticate, departmentController.getAll);
router.post('/departments', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']),departmentController.create);

router.get('/job-requisitions', authenticate, jobRequisitionController.getAll);
router.get('/job-requisitions/:id', authenticate, jobRequisitionController.getOne);
router.post('/job-requisitions', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), jobRequisitionController.create);
router.put('/job-requisitions/:id', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), jobRequisitionController.update);
router.delete('/job-requisitions/:id', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), jobRequisitionController.remove);


router.get('/candidates', authenticate, candidateController.getAll);
router.get('/candidates/:id', authenticate, candidateController.getOne);
router.post('/candidates', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), candidateController.create);
router.put('/candidates/:id', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), candidateController.update);
router.put('/candidates/:id/stage', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), candidateController.updateStage);
router.delete('/candidates/:id', authenticate, authorize(['Manager', 'HROfficer', 'GeneralManager']), candidateController.remove);

router.post('/candidates/:id/documents', authenticate, upload.array('documents'), candidateController.uploadDocument);
router.delete('/candidates/:id/documents', authenticate, candidateController.deleteDocument);

// Add more routes later: job requisition, candidate, dashboard

module.exports = router;
