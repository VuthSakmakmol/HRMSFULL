const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const C = require('../../controllers/hrss/shiftAssignmentController');

// All routes require auth + company guard
router.post('/',     authenticate, authorizeCompanyAccess, C.create);     // create assignment
router.get('/',      authenticate, authorizeCompanyAccess, C.list);       // list (filterable)
router.get('/:id',   authenticate, authorizeCompanyAccess, C.getOne);     // fetch one
router.put('/:id',   authenticate, authorizeCompanyAccess, C.update);     // update
router.delete('/:id',authenticate, authorizeCompanyAccess, C.remove);     // hard delete or soft via ?soft=true

module.exports = router;
