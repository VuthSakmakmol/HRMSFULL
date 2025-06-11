const express = require('express')
const router = express.Router()

const {
  getAll,
  getById,
  create,
  update,
  remove,
  removeJobTitles
} = require('../../controllers/ta/departmentController')

const { authenticate } = require('../../middlewares/authMiddleware') // ✅ Auth

// 🟢 Auth-protected routes
router.get('/departments', authenticate, getAll)
router.get('/departments/:id', authenticate, getById)
router.post('/departments', authenticate, create)
router.put('/departments/:id', authenticate, update)
router.delete('/departments/:id', authenticate, remove)
router.put('/departments/:id/remove-job-titles', authenticate, removeJobTitles) // optional for partial delete

module.exports = router
