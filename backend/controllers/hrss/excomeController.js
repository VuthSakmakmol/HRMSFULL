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



// GET /api/hrss/excome/resign-reason-summary?year=2025
exports.getMonthlyResignReasonDirectStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const company = req.company;

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' });
    }

    const sewerPositions = ['Sewer', 'Jumper'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Step 1: Fetch resign employees for this year, this company, only sewer positions
    const allEmployees = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $in: sewerPositions },
      resignReason: { $ne: '' },
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    });

    console.log('👉 Total Matching Employees:', allEmployees.length);

    // Step 2: Initialize monthly summary
    const summary = Array.from({ length: 12 }, () => ({}));

    for (const emp of allEmployees) {
      const month = new Date(emp.resignDate).getMonth(); // 0 = Jan, 11 = Dec
      const reason = emp.resignReason?.trim() || 'Unknown';
      summary[month][reason] = (summary[month][reason] || 0) + 1;
    }

    // Step 3: Collect all unique reasons
    const reasonSet = new Set();
    summary.forEach(monthMap => {
      Object.keys(monthMap).forEach(reason => reasonSet.add(reason));
    });

    // Step 4: Build formatted result table
    const result = [];
    const totalByMonth = Array(12).fill(0);

    reasonSet.forEach(reason => {
      const row = { reason };
      let total = 0;

      for (let i = 0; i < 12; i++) {
        const count = summary[i][reason] || 0;
        row[monthLabels[i]] = count;
        totalByMonth[i] += count;
        total += count;
      }

      row.total = total;
      result.push(row);
    });

    // Step 5: Add percent column
    const grandTotal = totalByMonth.reduce((a, b) => a + b, 0);
    result.forEach(row => {
      const percent = row.total > 0 ? Math.round((row.total / grandTotal) * 100) : 0;
      row.percent = `${percent}%`;
    });

    res.json({ year, table: result });
  } catch (err) {
    console.error('Error in getMonthlyResignReasonStats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getResignReasonDirectLabor = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const directPositions = ['Sewer', 'Jumper']
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const resigns = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $in: directPositions },
      resignReason: { $ne: '' },
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    })

    console.log(`📦 Resigned Direct Labor (${year}):`, resigns.length)

    // Step 1: Count resigns by month & reason
    const monthly = Array.from({ length: 12 }, () => ({}))
    for (const emp of resigns) {
      const monthIndex = new Date(emp.resignDate).getMonth()
      const reason = emp.resignReason?.trim() || 'Unknown'
      monthly[monthIndex][reason] = (monthly[monthIndex][reason] || 0) + 1
    }

    // Step 2: Collect all unique reasons
    const reasons = new Set()
    monthly.forEach(monthMap => {
      Object.keys(monthMap).forEach(r => reasons.add(r))
    })

    // Step 3: Build final table
    const result = []
    const totalPerMonth = Array(12).fill(0)

    reasons.forEach(reason => {
      const row = { reason }
      let total = 0

      for (let i = 0; i < 12; i++) {
        const count = monthly[i][reason] || 0
        row[monthLabels[i]] = count
        totalPerMonth[i] += count
        total += count
      }

      row.total = total
      result.push(row)
    })

    // Step 4: Calculate % column
    const grandTotal = totalPerMonth.reduce((a, b) => a + b, 0)
    result.forEach(row => {
      const percent = row.total > 0 ? Math.round((row.total / grandTotal) * 100) : 0
      row.percent = `${percent}%`
    })

    res.json({ year, table: result })
  } catch (err) {
    console.error('❌ Error in getResignReasonDirectLabor:', err)
    res.status(500).json({ message: 'Server error' })
  }
}


exports.getMonthlyResignReasonIndirectStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const excludeDirectPositions = ['Sewer', 'Jumper']
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Step 1: Fetch resign employees for this year, this company, indirect positions
    const allEmployees = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $nin: excludeDirectPositions },
      resignReason: { $ne: '' },
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    })

    console.log('👉 Total Indirect Resign Employees:', allEmployees.length)

    // Step 2: Initialize monthly summary
    const summary = Array.from({ length: 12 }, () => ({}))

    for (const emp of allEmployees) {
      const month = new Date(emp.resignDate).getMonth() // 0 = Jan, 11 = Dec
      const reason = emp.resignReason?.trim() || 'Unknown'
      summary[month][reason] = (summary[month][reason] || 0) + 1
    }

    // Step 3: Collect all unique reasons
    const reasonSet = new Set()
    summary.forEach(monthMap => {
      Object.keys(monthMap).forEach(reason => reasonSet.add(reason))
    })

    // Step 4: Build formatted result table
    const result = []
    const totalByMonth = Array(12).fill(0)

    reasonSet.forEach(reason => {
      const row = { reason }
      let total = 0

      for (let i = 0; i < 12; i++) {
        const count = summary[i][reason] || 0
        row[monthLabels[i]] = count
        totalByMonth[i] += count
        total += count
      }

      row.total = total
      result.push(row)
    })

    // Step 5: Add percent column
    const grandTotal = totalByMonth.reduce((a, b) => a + b, 0)
    result.forEach(row => {
      const percent = row.total > 0 ? Math.round((row.total / grandTotal) * 100) : 0
      row.percent = `${percent}%`
    })

    res.json({ year, table: result })
  } catch (err) {
    console.error('❌ Error in getMonthlyResignReasonIndirectStats:', err)
    res.status(500).json({ message: 'Server error' })
  }
}


exports.getResignReasonIndirectLabor = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const resigns = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $nin: ['Sewer', 'Jumper'] },
      resignReason: { $ne: '' },
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      }
    })

    console.log(`📦 Resigned Indirect Labor (${year}):`, resigns.length)

    // Step 1: Group by month + reason
    const monthly = Array.from({ length: 12 }, () => ({}))
    for (const emp of resigns) {
      const monthIndex = new Date(emp.resignDate).getMonth()
      const reason = emp.resignReason?.trim() || 'Unknown'
      monthly[monthIndex][reason] = (monthly[monthIndex][reason] || 0) + 1
    }

    // Step 2: Collect all reasons
    const reasons = new Set()
    monthly.forEach(monthMap => {
      Object.keys(monthMap).forEach(r => reasons.add(r))
    })

    // Step 3: Format table
    const result = []
    const totalPerMonth = Array(12).fill(0)

    reasons.forEach(reason => {
      const row = { reason }
      let total = 0
      for (let i = 0; i < 12; i++) {
        const count = monthly[i][reason] || 0
        row[monthLabels[i]] = count
        totalPerMonth[i] += count
        total += count
      }
      row.total = total
      result.push(row)
    })

    // Step 4: Add %
    const grandTotal = totalPerMonth.reduce((a, b) => a + b, 0)
    result.forEach(row => {
      const percent = row.total > 0 ? Math.round((row.total / grandTotal) * 100) : 0
      row.percent = `${percent}%`
    })

    res.json({ year, table: result })
  } catch (err) {
    console.error('❌ Error in getResignReasonIndirectLabor:', err)
    res.status(500).json({ message: 'Server error' })
  }
}