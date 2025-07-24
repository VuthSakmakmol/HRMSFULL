// controllers/hrss/excomeController.js

const Employee       = require('../../models/hrss/employee')
const ManpowerTarget = require('../../models/hrss/manpowerTarget')



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


// controllers/hrss/excomeController.js

exports.getAverageAge = async (req, res) => {
  try {
    const company = req.company
    if (!company) return res.status(403).json({ message: 'Unauthorized' })

    // Base match filter
    const base = { company, status: 'Working' }

    // Helper: average the stored `age` field
    const computeAvg = async (extraFilter) => {
      const [group] = await Employee.aggregate([
        { $match: { ...base, ...extraFilter } },
        { $group: { _id: null, avgAge: { $avg: '$age' } } }
      ])
      return group ? Math.round(group.avgAge * 10) / 10 : 0
    }

    const totalAvg = await computeAvg({})
    const sewerAvg = await computeAvg({ position: { $in: ['Sewer','Jumper'] } })

    return res.json({ total: totalAvg, sewer: sewerAvg })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Failed-avgAge', error: err.message })
  }
}

// ─── Average Years of Service ───────────────────────────────────────────────
exports.getAverageService = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Missing company' });

    const computeService = async (matchFilter) => {
      const result = await Employee.aggregate([
        { $match: { company, status: 'Working', ...matchFilter } },
        { $project: { serviceMs: { $subtract: ['$$NOW', '$joinDate'] } } },
        { $project: { serviceYears: { $divide: ['$serviceMs', 1000 * 60 * 60 * 24 * 365] } } },
        { $group:   { _id: null, avgService: { $avg: '$serviceYears' } } }
      ]);
      if (!result.length) return 0;
      return Math.round(result[0].avgService * 10) / 10;
    };

    const total   = await computeService({});   
    const sewer   = await computeService({ 
      position: { $in: ['Sewer', 'Jumper'] } 
    });

    res.json({ total, sewer });
  }
  catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Could not calculate service' });
  }
};

