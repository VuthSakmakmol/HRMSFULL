const express = require('express')
const router = express.Router()
const Employee = require('../../models/hrss/employee')

// ─── Get Total, Male, Female Employees ────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const total = await Employee.countDocuments()
    const male = await Employee.countDocuments({ gender: 'Male' })
    const female = await Employee.countDocuments({ gender: 'Female' })
    res.json({ total, male, female })
  } catch (err) {
    console.error('❌ Error fetching employee summary:', err.message)
    res.status(400).json({ error: 'Failed to fetch employee summary' })
  }
})

// ─── Get Monthly Join Counts ──────────────────────────────────
router.get('/employees/monthly', async (req, res) => {
  try {
    const data = await Employee.aggregate([
      {
        $group: {
          _id: { $substr: ['$createdAt', 0, 7] }, // 'YYYY-MM'
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
    res.json(data)
  } catch (err) {
    console.error('❌ Error fetching monthly joins:', err.message)
    res.status(400).json({ error: 'Failed to fetch monthly join data' })
  }
})

// ─── Get Gender Breakdown ─────────────────────────────────────
router.get('/employees/gender', async (req, res) => {
  try {
    const data = await Employee.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ])
    res.json(data)
  } catch (err) {
    console.error('❌ Error fetching gender breakdown:', err.message)
    res.status(400).json({ error: 'Failed to fetch gender breakdown' })
  }
})

module.exports = router
