const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const departmentController = require('../../controllers/ta/departmentController');

// ✅ Authenticate all routes
router.use(authenticate);

// ✅ GET all departments with filters
router.get('/', departmentController.getAll);

// ✅ GET department by ID
router.get('/:id', departmentController.getById);

module.exports = router;
