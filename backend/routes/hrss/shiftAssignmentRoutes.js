// routes/hrss/shiftAssignmentRoutes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const C = require('../../controllers/hrss/shiftAssignmentController');

// ── CRUD for shift assignments ──
router.post('/', authenticate, authorizeCompanyAccess, C.createAssignment);
router.get('/', authenticate, authorizeCompanyAccess, C.listAssignments);
router.get('/resolve', authenticate, authorizeCompanyAccess, C.resolveEffective);
router.get('/:id', authenticate, authorizeCompanyAccess, C.getAssignment);
router.put('/:id', authenticate, authorizeCompanyAccess, C.updateAssignment);
router.delete('/:id', authenticate, authorizeCompanyAccess, C.deleteAssignment);

module.exports = router;
