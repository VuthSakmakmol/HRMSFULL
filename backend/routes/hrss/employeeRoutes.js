// routes/hrss/employees.js
const express = require('express');
const router = express.Router();
const multer = require('multer');

const XLSX = require('xlsx'); // (not used here directly, but fine if you need elsewhere)
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorize, authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware');
const userController = require('../../controllers/userController');

const ctrl = require('../../controllers/hrss/employeeController');

// Multer: in‑memory for Excel uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

/* -------------------------- utilities / misc -------------------------- */
// Get emails of all users (as in your snippet)
router.get(
  '/emails',
  authenticate,
  authorize(['GeneralManager', 'Manager']),
  authorizeCompanyAccess,
  userController.getUserEmails
);

/* ---------------------------- Excel import ---------------------------- */
// 1) Direct import from Excel file (saves immediately)
router.post(
  '/import-excel',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  upload.single('file'),
  ctrl.importExcelDirect
);

// 2) Optional JSON-based preview + confirm flow
router.post(
  '/import-preview',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  ctrl.previewImport
);
router.post(
  '/import-confirmed',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  ctrl.confirmImport
);

/* -------------------------------- CRUD ------------------------------- */
router.get('/', authenticate, authorizeCompanyAccess, ctrl.getAllEmployees);

// ⚠️ Keep this BEFORE '/:id'
router.get(
  '/by-employee-id/:employeeId',
  authenticate,
  authorizeCompanyAccess,
  ctrl.getEmployeeByEmployeeId
);

router.get('/:id', authenticate, authorizeCompanyAccess, ctrl.getEmployeeById);
router.post('/', authenticate, authorizeCompanyAccess, enforceCrudPermissions, ctrl.createEmployee);
router.put('/:id', authenticate, authorizeCompanyAccess, enforceCrudPermissions, ctrl.updateEmployee);
router.delete('/:id', authenticate, authorizeCompanyAccess, enforceCrudPermissions, ctrl.deleteEmployee);

// Bulk delete (optional)
router.post(
  '/bulk-delete',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  ctrl.deleteMultipleEmployees
);

module.exports = router;
