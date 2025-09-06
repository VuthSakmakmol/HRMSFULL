// routes/hrss/shiftTemplateRoutes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const C = require('../../controllers/hrss/shiftTemplateController');

// ── CRUD for shift templates ──
router.post('/', authenticate, authorizeCompanyAccess, C.createShiftTemplate);
router.get('/', authenticate, authorizeCompanyAccess, C.listShiftTemplates);
router.get('/:id', authenticate, authorizeCompanyAccess, C.getShiftTemplate);
router.put('/:id', authenticate, authorizeCompanyAccess, C.updateShiftTemplate);
router.delete('/:id', authenticate, authorizeCompanyAccess, C.deleteShiftTemplate);

module.exports = router;
