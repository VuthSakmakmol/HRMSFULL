const express = require('express')
const router = express.Router()

const {
  getAll,
  getById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  addJobTitle,
  removeJobTitle,
  addRecruiter,
  removeRecruiter
} = require('../../controllers/ta/departmentController')

const { authenticate } = require('../../middlewares/authMiddleware') // ✅ Auth

// 🟢 Auth-protected routes
router.get('/departments', authenticate, getAll)
router.get('/departments/:id', authenticate, getById)





module.exports = router
