const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../../controllers/hrss/employeeController');

const { authenticate } = require('../../middlewares/authMiddleware');

// ─── Multer Config for Image Upload ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'upload/employeeImages'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// ─── Employee Routes (Require Authentication) ───────────────────────────────────
router.get('/', authenticate, getAllEmployees);
router.get('/:id', authenticate, getEmployeeById);
router.post('/', authenticate, createEmployee);
router.put('/:id', authenticate, updateEmployee);
router.delete('/:id', authenticate, deleteEmployee);

// ─── Image Upload Route ────────────────────────────────────────────────────────
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const imageUrl = `/upload/employeeImages/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router;
