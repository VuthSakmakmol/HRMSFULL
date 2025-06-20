const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// ─── Multer Storage Configuration ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'upload/profile-images'); // Folder for storing uploaded images
  },
  filename: (req, file, cb) => {
    const uniqueName = `emp-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// ─── Profile Image Upload Endpoint ─────────────────────────────────────────────
router.post('/profile-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const imageUrl = `/upload/profile-images/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router;
