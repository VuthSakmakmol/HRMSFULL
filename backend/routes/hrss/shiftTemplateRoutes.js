// routes/hrss/shiftTemplateRoutes.js
const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const C = require('../../controllers/hrss/shiftTemplateController');

// ── CRUD for shift templates ──
// ✅ Create new template
router.post('/', authenticate, authorizeCompanyAccess, C.createShiftTemplate);

// ✅ List all templates (supports ?q=&active=true|false)
router.get('/', authenticate, authorizeCompanyAccess, C.listShiftTemplates);

// ✅ Get single template
router.get('/:id', authenticate, authorizeCompanyAccess, C.getShiftTemplate);

// ✅ Update template
router.put('/:id', authenticate, authorizeCompanyAccess, C.updateShiftTemplate);

// ✅ Delete template (soft delete if in use)
router.delete('/:id', authenticate, authorizeCompanyAccess, C.deleteShiftTemplate);

module.exports = router;
