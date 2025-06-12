const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} = require('../../controllers/hrss/employeeController');

const { authenticate } = require('../../middlewares/authMiddleware');

// ✅ These will be prefixed with /api/employees
router.get('/', authenticate, getAllEmployees);
router.get('/:id', authenticate, getEmployeeById);
router.post('/', authenticate, createEmployee);
router.put('/:id', authenticate, updateEmployee);
router.delete('/:id', authenticate, deleteEmployee);

module.exports = router;
