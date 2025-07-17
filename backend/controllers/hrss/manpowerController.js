// controllers/hrss/manpowerController.js

const ManpowerTarget = require('../../models/hrss/manpowerTarget')
const Employee       = require('../../models/hrss/employee')

/**
 * POST /api/hrss/manpower/targets
 * Body: { department, position, yearMonth: 'YYYY-MM', target: Number }
 * Creates or updates the target for that dept+position+month.
 */
exports.createOrUpdateTarget = async (req, res) => {
  try {
    const { department, position, yearMonth, target } = req.body
    const company = req.company
    if (!company) 
      return res.status(403).json({ message: 'Unauthorized' })
    if (!department || !position || !yearMonth || typeof target !== 'number') {
      return res
        .status(400)
        .json({ message: 'Missing required fields' })
    }

    const filter  = { company, department, position, yearMonth }
    const update  = { $set: { target } }
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
    if (!company) 
      return res.status(403).json({ message: 'Unauthorized' })

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
// GET /hrss/manpower/summary?yearMonth=YYYY-MM
exports.getMonthlyManpower = async (req, res) => {
  try {
    const { yearMonth } = req.query;
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized' });
    if (!yearMonth) return res.status(400).json({ message: 'yearMonth is required' });

    // 1) load all targets for the month
    const targets = await ManpowerTarget.find({ company, yearMonth });

    // 2) aggregate **only** those employees whose status is 'Working' 
    const actuals = await Employee.aggregate([
      { $match: { company, status: 'Working' } },   // ← filter here
      { $group: {
          _id: { department: '$department', position: '$position' },
          count: { $sum: 1 }
      }},
    ]);

    // map for quick lookup
    const actualMap = new Map();
    actuals.forEach(a => {
      const key = `${a._id.department}||${a._id.position}`;
      actualMap.set(key, a.count);
    });

    // 3) combine into summary array
    const summary = targets.map(t => {
      const key   = `${t.department}||${t.position}`;
      const total = actualMap.get(key) || 0;
      return {
        department: t.department,
        position:   t.position,
        total,
        target:     t.target,
        difference: t.target - total
      };
    });

    res.json(summary);
  } catch (err) {
    console.error('❌ getMonthlyManpower error:', err);
    res.status(500).json({ message: 'Failed to compute manpower', error: err.message });
  }
};


/**
 * GET /api/hrss/manpower/list
 * Returns every { department, position } pair.
 */
exports.listDepartmentPositions = async (req, res) => {
  try {
    const company = req.company
    if (!company) 
      return res.status(403).json({ message: 'Unauthorized' })

    const combos = await Employee.aggregate([
      { $match: { company } },
      {
        $group: {
          _id: {
            department: '$department',
            position:   '$position'
          }
        }
      },
      {
        $project: {
          _id:        0,
          department: '$_id.department',
          position:   '$_id.position'
        }
      },
      { $sort: { department: 1, position: 1 } }
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
    if (!company) 
      return res.status(403).json({ message: 'Unauthorized' })

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
