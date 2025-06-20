const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Make sure 'uploads/profile' folder exists
const uploadPath = path.join(__dirname, '../uploads/profile');
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadPath),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, name);
  }
});

const upload = multer({ storage });

module.exports = upload;
