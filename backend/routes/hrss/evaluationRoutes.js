const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { 
        createEvaluation, 
        getEvaluationsByEmployee, 
        updateEvaluation, 
        deleteEvaluation 
      } = require('../../controllers/hrss/evaluationController');

router.post('/', authenticate, authorizeCompanyAccess, createEvaluation);
router.get('/:employeeId', authenticate, authorizeCompanyAccess, getEvaluationsByEmployee);
router.put('/:id', authenticate, authorizeCompanyAccess, updateEvaluation);
router.delete('/:id', authenticate, authorizeCompanyAccess, deleteEvaluation);

module.exports = router;
