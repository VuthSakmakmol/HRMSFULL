// controllers/hrss/excomeController.js

const Employee       = require('../../models/hrss/employee')
const ManpowerTarget = require('../../models/hrss/manpowerTarget')

/**
 * GET /api/excome/employee-count?month=YYYY-MM
 * (unchanged)
 */
exports.getMonthlyEmployeeCount = async (req, res) => {
  try {
    const { month } = req.query
    let year, monthIndex

    if (month) {
      const parts = month.split('-')
      if (parts.length !== 2) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM.' })
      }
      year       = parseInt(parts[0], 10)
      monthIndex = parseInt(parts[1], 10) - 1
      if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM.' })
      }
    } else {
      const now = new Date()
      year       = now.getFullYear()
      monthIndex = now.getMonth()
    }

    const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized: company missing' })
    }

    const baseFilter = {
      company,
      status: 'Working',
      joinDate: { $lte: endOfMonth }
    }

    const [directCount, marketingCount, indirectCount] = await Promise.all([
      Employee.countDocuments({ ...baseFilter, position: { $in: ['Sewer','Jumper'] } }),
      Employee.countDocuments({ ...baseFilter, department: 'Merchandising' }),
      Employee.countDocuments({
        ...baseFilter,
        position:   { $nin: ['Sewer','Jumper'] },
        department: { $ne:  'Merchandising' }
      }),
    ])

    const responseMonth = `${year}-${String(monthIndex + 1).padStart(2,'0')}`
    return res.json({
      month: responseMonth,
      counts: {
        directLabor:   directCount,
        marketing:     marketingCount,
        indirectLabor: indirectCount
      }
    })
  } catch (err) {
    console.error('[GET MONTHLY EMPLOYEE COUNT ERROR]', err)
    return res.status(500).json({ message: 'Failed to get employee counts', error: err.message })
  }
}


/**
 * GET /api/excome/manpower/targets?year=YYYY
 *
 * Returns:
 * {
 *   months: ['2025-01','2025-02',…],
 *   categories: [
 *     { key:'direct',   title:'Direct',   targetBudget:[], targetRoadmap:[], actual:[], varianceBudget:[], varianceRoadmap:[] },
 *     { key:'indirect', title:'Indirect', …same shape… }
 *   ]
 * }
 */
exports.getManpowerTargets = async (req, res) => {
  try {
    const { year } = req.query
    if (!year) {
      return res.status(400).json({ message: 'year is required' })
    }

    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized: company missing' })
    }

    // 1) Load all target docs for that year
    const allTargets = await ManpowerTarget
      .find({ company, yearMonth: new RegExp(`^${year}-`) })
      .sort('yearMonth')

    // 2) Unique, sorted months
    const months = Array.from(
      new Set(allTargets.map(t => t.yearMonth))
    ).sort()

    // 3) Define Direct vs Indirect
    const categoryDefs = [
      {
        key: 'direct',
        title: 'Direct',
        // target docs filter
        matchTarget: t => ['Sewer','Jumper'].includes(t.position),
        // actual headcount filter
        matchActual: { position: { $in: ['Sewer','Jumper'] } }
      },
      {
        key: 'indirect',
        title: 'Indirect + Merchandise',
        // everyone else
        matchTarget: t => !['Sewer','Jumper'].includes(t.position),
        matchActual: { position: { $nin: ['Sewer','Jumper'] } }
      }
    ]

    // 4) Build the arrays for each category
    const categories = await Promise.all(
      categoryDefs.map(async ({ key, title, matchTarget, matchActual }) => {
        // filter down targets
        const docs = allTargets.filter(matchTarget)

        // sum budget & roadmap per month
        const targetBudget  = months.map(m =>
          docs.filter(d => d.yearMonth === m)
              .reduce((sum, d) => sum + d.target, 0)
        )
        const targetRoadmap = months.map(m =>
          docs.filter(d => d.yearMonth === m)
              .reduce((sum, d) => sum + (d.roadmap||0), 0)
        )

        // count actual headcount per month
        const actual = await Promise.all(
          months.map(async m => {
            const [y, mm] = m.split('-').map(n => +n)
            const endOfMonth = new Date(y, mm, 0, 23, 59, 59, 999)
            return Employee.countDocuments({
              company,
              status:   'Working',
              joinDate: { $lte: endOfMonth },
              ...matchActual
            })
          })
        )

        // compute variances
        const varianceBudget  = targetBudget.map((b,i) => b - actual[i])
        const varianceRoadmap = targetRoadmap.map((r,i) => r - actual[i])

        return {
          key,
          title,
          targetBudget,
          targetRoadmap,
          actual,
          varianceBudget,
          varianceRoadmap
        }
      })
    )

    // 5) Send it back
    return res.json({ months, categories })

  } catch (err) {
    console.error('[GET MANPOWER TARGETS ERROR]', err)
    return res.status(500).json({
      message: 'Failed to get manpower targets',
      error:   err.message
    })
  }
}
