const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Employee = require('../../models/hrss/employee')

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
// router.post('/upload', upload.single('image'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No file uploaded' });
//   }

//   const imageUrl = `/upload/employeeImages/${req.file.filename}`;
//   res.json({ imageUrl });
// });


//======= Import data ================
router.post('/import', async (req, res) => {
  try {
    const data = req.body
    if (!Array.isArray(data)) {
      return res.status(400).json({ message: 'Invalid format' })
    }

    await Employee.insertMany(data)
    res.status(200).json({ message: 'Import success' })
  } catch (err) {
    res.status(500).json({ message: 'Import failed', error: err.message })
  }
})


module.exports = router;
