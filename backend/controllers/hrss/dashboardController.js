const Employee = require('../../models/hrss/employee')

// ─── Total Employees, Male, Female ──────────────────────────────
exports.getEmployeeSummary = async (req, res) => {
  try {
    const total = await Employee.countDocuments()
    const male = await Employee.countDocuments({ gender: 'Male' })
    const female = await Employee.countDocuments({ gender: 'Female' })
    res.json({ total, male, female })
  } catch (err) {
    console.error('❌ Error fetching employee summary:', err.message)
    res.status(400).json({ error: 'Failed to fetch employee summary' })
  }
}

// ─── Monthly Joined Chart ───────────────────────────────────────

exports.getMonthlyJoinChart = async (req, res) => {
  try {
    const data = await Employee.aggregate([
      {
        $match: {
          joinDate: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$joinDate" }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    res.json(data)
  } catch (err) {
    console.error('❌ Error fetching monthly joins:', err.message)
    res.status(500).json({ error: 'Failed to fetch monthly join data' })
  }
}



// ─── Gender Breakdown ───────────────────────────────────────────
// controllers/dashboardController.js
exports.getGenderBreakdown = async (req, res) => {
  try {
    const company = req.user?.company || req.query.company // if needed
    const query = company ? { company } : {}

    const result = await Employee.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $ifNull: ['$gender', 'Other'] },
          count: { $sum: 1 }
        }
      }
    ])

    res.json(result)
  } catch (err) {
    console.error('❌ Failed to fetch gender breakdown:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
}


