const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Employee = require('../../models/hrss/employee');
const { authenticate } = require('../../middlewares/authMiddleware');

// ────────────────────────────────────────────────────────────────────────────────
// Controllers
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  previewImport,
  confirmImport
} = require('../../controllers/hrss/employeeController');

// ────────────────────────────────────────────────────────────────────────────────
// Multer setup for Excel file upload (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// ────────────────────────────────────────────────────────────────────────────────
// Helper to convert Excel serial dates to JS Date objects
function excelDateToJSDate(serial) {
  if (typeof serial === 'number') {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    return new Date(utcValue * 1000);
  }
  return new Date(serial); // fallback for ISO-style dates
}

// ────────────────────────────────────────────────────────────────────────────────
// Excel Import API — directly save to DB
router.post('/import-excel', authenticate, upload.single('file'), async (req, res) => {
  try {
    const company = req.user.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const workbook = XLSX.read(req.file.buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    if (!data.length) return res.status(400).json({ message: 'Excel file is empty' });

    const inserted = [];
    const failed = [];

    for (const item of data) {
      try {
        // Fix date fields
        const dateFields = [
          'dob',
          'joinDate',
          'idCardExpireDate',
          'passportExpireDate',
          'visaExpireDate',
          'medicalCheckDate',
        ];

        dateFields.forEach(field => {
          if (item[field]) item[field] = excelDateToJSDate(item[field]);
        });

        const emp = new Employee({ ...item, company });
        await emp.validate();
        await emp.save();
        inserted.push(emp);
      } catch (err) {
        failed.push({ item, reason: err.message });
      }
    }

    res.status(200).json({
      message: `✅ Imported ${inserted.length} employees.`,
      failedCount: failed.length,
      failed
    });
  } catch (err) {
    console.error('❌ Excel import failed:', err.message);
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────────
// Employee CRUD
router.get('/', authenticate, getAllEmployees);
router.get('/:id', authenticate, getEmployeeById);
router.post('/', authenticate, createEmployee);
router.put('/:id', authenticate, updateEmployee);
router.delete('/:id', authenticate, deleteEmployee);

// ────────────────────────────────────────────────────────────────────────────────
// Optional legacy preview/confirm import endpoints (JSON-based)
router.post('/import-preview', authenticate, previewImport);
router.post('/import-confirmed', authenticate, confirmImport);

module.exports = router;
