const express = require('express')
const router = express.Router()
const upload = require('../../middlewares/employeeProfileUpload')

router.post('/hrss/profile-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  const imageUrl = `/upload/hrss/profile-images/${req.file.filename}`;
  res.json({ imageUrl });
});

module.exports = router
  