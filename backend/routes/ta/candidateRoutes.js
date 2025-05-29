const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const candidateController = require('../../controllers/ta/candidateController');
const { authenticate } = require('../../middlewares/authMiddleware'); // ✅ adjust path if needed

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

// ─── Candidate Routes ────────────────────────────────────────────────

// Create new candidate
router.post('/', authenticate, candidateController.create);

// Get all candidates
router.get('/', authenticate, candidateController.getAll);

// Get one candidate by ID
router.get('/:id', authenticate, candidateController.getOne);

// Update basic info (name, recruiter, etc.)
router.put('/:id', authenticate, candidateController.update);

// Delete a candidate
router.delete('/:id', authenticate, candidateController.remove);

// Update stage (progress like Interview, JobOffer, etc.)
router.put('/:id/stage', authenticate, candidateController.updateStage);

// Upload documents (CVs, PDFs, etc.)
router.post('/:id/documents', authenticate, upload.array('documents'), candidateController.uploadDocument);

// Delete a specific document
router.delete('/:id/documents', authenticate, candidateController.deleteDocument);

module.exports = router;
