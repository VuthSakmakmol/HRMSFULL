// routes/hrss/employeeRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware');
const ctrl = require('../../controllers/hrss/employeeController');

const upload = multer({ storage: multer.memoryStorage() });

// ───────────────────────── Excel Import ─────────────────────────
router.post(
  '/import-excel',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  upload.single('file'),
  ctrl.importEmployees
);

// ───────────────────────── CRUD ─────────────────────────
router.get('/', authenticate, authorizeCompanyAccess, ctrl.getAllEmployees);
router.get('/:id', authenticate, authorizeCompanyAccess, ctrl.getEmployeeById);
router.post('/', authenticate, authorizeCompanyAccess, enforceCrudPermissions, ctrl.createEmployee);
router.put('/:id', authenticate, authorizeCompanyAccess, enforceCrudPermissions, ctrl.updateEmployee);
router.delete('/:id', authenticate, authorizeCompanyAccess, enforceCrudPermissions, ctrl.deleteEmployee);

module.exports = router;
