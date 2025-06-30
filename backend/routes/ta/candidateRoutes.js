const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const candidateController = require('../../controllers/ta/candidateController');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');
const { enforceCrudPermissions } = require('../../middlewares/crudPermissionMiddleware');

// ─── Multer Config for Document Upload ───────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/candidate_docs/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

// ─── Candidate CRUD Routes ────────────────────────────────────────────

// Create new candidate
router.post(
  '/',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  candidateController.create
);

// Get all candidates
router.get(
  '/',
  authenticate,
  authorizeCompanyAccess,
  candidateController.getAll
);

// Get one candidate by ID
router.get(
  '/:id',
  authenticate,
  authorizeCompanyAccess,
  candidateController.getOne
);

// Update basic info
router.put(
  '/:id',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  candidateController.update
);

// Delete a candidate
router.delete(
  '/:id',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  candidateController.remove
);

// Update stage (progress)
router.put(
  '/:id/stage',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  candidateController.updateStage
);

// Upload candidate documents
router.post(
  '/:id/documents',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  upload.array('documents'),
  candidateController.uploadDocument
);

// Delete specific document
router.delete(
  '/:id/documents',
  authenticate,
  authorizeCompanyAccess,
  enforceCrudPermissions,
  candidateController.deleteDocument
);

// Get job requisition availability for a candidate's job
router.get(
  '/:id/availability',
  authenticate,
  authorizeCompanyAccess,
  candidateController.getAvailability
);

module.exports = router;
