// controllers/hrss/manpowerController.js

const ManpowerTarget = require('../../models/hrss/manpowerTarget')
const Employee       = require('../../models/hrss/employee')

/**
 * POST /api/hrss/manpower/targets
 * Body: { department, position, yearMonth: 'YYYY-MM', target: Number, roadmap?: Number }
 * Creates or updates the target (budget) and roadmap for that dept+position+month.
 */
exports.createOrUpdateTarget = async (req, res) => {
  try {
    const {
      department,
      position,
      yearMonth,
      target,
      roadmap = 0
    } = req.body

    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    if (
      !department ||
      !position ||
      !yearMonth ||
      typeof target !== 'number' ||
      typeof roadmap !== 'number'
    ) {
      return res.status(400).json({ message: 'Missing or invalid fields' })
    }

    const filter = { company, department, position, yearMonth }
    const update = { $set: { target, roadmap } }
    const options = { upsert: true, new: true }

    const doc = await ManpowerTarget.findOneAndUpdate(filter, update, options)
    return res.json(doc)
  } catch (err) {
    console.error('❌ createOrUpdateTarget error:', err)
    return res
      .status(500)
      .json({ message: 'Failed to save target', error: err.message })
  }
}

/**
 * GET /api/hrss/manpower/targets?yearMonth=YYYY-MM
 * Lists all targets, optionally filtered to a specific month.
 */
exports.getTargets = async (req, res) => {
  try {
    const { yearMonth } = req.query
    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const filter = { company }
    if (yearMonth) filter.yearMonth = yearMonth

    const targets = await ManpowerTarget
      .find(filter)
      .sort({ department: 1, position: 1 })

    return res.json(targets)
  } catch (err) {
    console.error('❌ getTargets error:', err)
    return res
      .status(500)
      .json({ message: 'Failed to fetch targets', error: err.message })
  }
}

/**
 * GET /api/hrss/manpower/summary?yearMonth=YYYY-MM
 * Returns for each dept+position:
 *   { department, position, total, target, difference }
 */
exports.getMonthlyManpower = async (req, res) => {
  try {
    const { yearMonth } = req.query
    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized' })
    }
    if (!yearMonth) {
      return res.status(400).json({ message: 'yearMonth is required' })
    }

    // 1) load all targets for the month
    const targets = await ManpowerTarget.find({ company, yearMonth })

    // 2) aggregate actual headcount by department+position
    const actuals = await Employee.aggregate([
      { $match: { company, status: 'Working' } },
      { $group: {
          _id: { department: '$department', position: '$position' },
          count: { $sum: 1 }
      }}
    ])

    // build a lookup map
    const actualMap = new Map()
    actuals.forEach(a => {
      const key = `${a._id.department}||${a._id.position}`
      actualMap.set(key, a.count)
    })

    // 3) combine into summary
    const summary = targets.map(t => {
      const key   = `${t.department}||${t.position}`
      const total = actualMap.get(key) || 0
      return {
        department: t.department,
        position:   t.position,
        total,
        target:     t.target,
        difference: t.target - total
      }
    })

    return res.json(summary)
  } catch (err) {
    console.error('❌ getMonthlyManpower error:', err)
    return res
      .status(500)
      .json({ message: 'Failed to compute manpower', error: err.message })
  }
}

/**
 * GET /api/hrss/manpower/list
 * Returns every distinct { department, position } pair.
 */
exports.listDepartmentPositions = async (req, res) => {
  try {
    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const combos = await Employee.aggregate([
      { $match: { company } },
      { $group: {
          _id: { department: '$department', position: '$position' }
      }},
      { $project: {
          _id:        0,
          department: '$_id.department',
          position:   '$_id.position'
      }},
      { $sort: { department: 1, position: 1 }}
    ])

    return res.json(combos)
  } catch (err) {
    console.error('❌ listDepartmentPositions error:', err)
    return res
      .status(500)
      .json({ message: 'Failed to list combos', error: err.message })
  }
}

/**
 * GET /api/hrss/manpower/departments
 * Returns distinct list of all departments.
 */
exports.listDepartments = async (req, res) => {
  try {
    const company = req.company
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized' })
    }

    const departments = await Employee.distinct('department', { company })
    const deptList = departments
      .filter(d => d && d.trim() !== '')
      .sort((a, b) => a.localeCompare(b))

    return res.json(deptList)
  } catch (err) {
    console.error('❌ listDepartments error:', err)
    return res
      .status(500)
      .json({ message: 'Failed to list departments', error: err.message })
  }
}

/**
 * GET /api/hrss/manpower/targets/summary?year=YYYY
 * (or simply GET /api/hrss/manpower/targets?year=YYYY)
 * Returns six parallel arrays:
 *   months[], targetBudget[], targetRoadmap[], actual[],
 *   varianceBudget[], varianceRoadmap[]
 */
exports.getManpowerTargets = async (req, res) => {
  try {
    const year = req.query.year
    if (!year) return res.status(400).json({ message: 'year is required' })
    const company = req.company
    if (!company) return res.status(403).json({ message: 'Unauthorized' })

    // 1) Pull all target docs for that year
    const allTargets = await ManpowerTarget
      .find({ company, yearMonth: new RegExp(`^${year}-`) })
      .sort('yearMonth')

    // 2) Figure out the distinct months in order
    const months = Array.from(
      new Set(allTargets.map(t => t.yearMonth))
    ).sort()

    // 3) Define your three category filters
    const categoryDefs = [
      {
        key: 'whiteCollar',
        title: 'White Collar',
        // in your world, white-collar = department "Merchandising" (marketing)
        targetFilter: t => t.department === 'Merchandising',
        actualFilter: { department: 'Merchandising' }
      },
      {
        key: 'blueSewer',
        title: 'Blue Collar – Sewer',
        // blue-collar sewer = positions "Sewer" or "Sewer-Jumper"
        targetFilter: t => ['Sewer','Sewer-Jumper'].includes(t.position),
        actualFilter: { position: { $in: ['Sewer','Sewer-Jumper'] } }
      },
      {
        key: 'blueNonSewer',
        title: 'Blue Collar – Non-Sewer',
        // blue-collar non-sewer = not sewer/sewer-jumper AND not merchandising
        targetFilter: t =>
          !['Sewer','Sewer-Jumper'].includes(t.position) &&
          t.department !== 'Merchandising',
        actualFilter: {
          position:   { $nin: ['Sewer','Sewer-Jumper'] },
          department: { $ne: 'Merchandising' }
        }
      }
    ]

    // 4) For each category, build out the six arrays
    const categories = await Promise.all(
      categoryDefs.map(async ({ key, title, targetFilter, actualFilter }) => {
        // filter down your target docs
        const docs = allTargets.filter(targetFilter)

        // build sums per month
        const targetBudget   = months.map(m =>
          docs
            .filter(d => d.yearMonth === m)
            .reduce((sum, d) => sum + d.target, 0)
        )
        const targetRoadmap  = months.map(m =>
          docs
            .filter(d => d.yearMonth === m)
            .reduce((sum, d) => sum + (d.roadmap || 0), 0)
        )

        // compute actual headcount per month
        const actual = await Promise.all(
          months.map(async m => {
            const [y, mm] = m.split('-').map(n => parseInt(n, 10))
            const endOfMonth = new Date(y, mm, 0, 23, 59, 59, 999)
            return Employee.countDocuments({
              company,
              status: 'Working',
              joinDate: { $lte: endOfMonth },
              ...actualFilter
            })
          })
        )

        // variances
        const varianceBudget  = targetBudget.map((b, i) => b - actual[i])
        const varianceRoadmap = targetRoadmap.map((r, i) => r - actual[i])

        return { key, title, targetBudget, targetRoadmap, actual, varianceBudget, varianceRoadmap }
      })
    )

    // 5) Return the full structure
    return res.json({ months, categories })

  } catch (err) {
    console.error('[GET MANPOWER TARGETS ERROR]', err)
    return res.status(500).json({ message: 'Failed to get manpower targets', error: err.message })
  }
}