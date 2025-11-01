// controllers/hrss/excomeController.js

const Employee       = require('../../models/hrss/employee')
const ManpowerTarget = require('../../models/hrss/manpowerTarget')
const moment = require('moment-timezone')


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
        matchTarget: t => ['Sewer','Sewer-Jumper'].includes(t.position),
        // actual headcount filter
        matchActual: { position: { $in: ['Sewer','Sewer-Jumper'] } }
      },
      {
        key: 'indirect',
        title: 'Indirect + Merchandise',
        // everyone else
        matchTarget: t => !['Sewer','Sewer-Jumper'].includes(t.position),
        matchActual: { position: { $nin: ['Sewer','Sewer-Jumper'] } }
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
    const sewerAvg = await computeAvg({ position: { $in: ['Sewer','Sewer-Jumper'] } })

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
      position: { $in: ['Sewer', 'Sewer-Jumper'] } 
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

    const sewerPositions = ['Sewer', 'Sewer-Jumper'];
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

    const directPositions = ['Sewer', 'Sewer-Jumper']
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

    const excludeDirectPositions = ['Sewer', 'Sewer-Jumper']
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
      position: { $nin: ['Sewer', 'Sewer-Jumper'] },
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

// GET /api/hrss/excome/period-of-direct-resign?year=2025
exports.getPeriodOfDirectLaborResignByYear = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const directPositions = ['Sewer', 'Sewer-Jumper']
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Fetch resigned direct labor this year
    const resigns = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $in: directPositions },
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      },
      joinDate: { $ne: null }
    })

    console.log(`📦 Resigned Direct Labor (${year}):`, resigns.length)

    // Buckets
    const groups = [
      { label: '< 2 M', test: d => d < 2 },
      { label: '2 - 6 Months', test: d => d >= 2 && d < 6 },
      { label: '6 Months- 1 Year', test: d => d >= 6 && d < 12 },
      { label: '1 Year- 2 Year', test: d => d >= 12 && d < 24 },
      { label: '2-5 Years', test: d => d >= 24 && d < 60 },
      { label: '> 5 Years', test: d => d >= 60 }
    ]

    // Summary format
    const summary = {}
    for (const group of groups) {
      summary[group.label] = {
        group: group.label,
        total: 0
      }
      monthLabels.forEach(m => summary[group.label][m] = 0)
    }

    // Process each resignation
    for (const emp of resigns) {
      const join = new Date(emp.joinDate)
      const resign = new Date(emp.resignDate)
      const diffInMonths =
        (resign.getFullYear() - join.getFullYear()) * 12 +
        (resign.getMonth() - join.getMonth())

      const monthIdx = resign.getMonth()
      const monthLabel = monthLabels[monthIdx]

      const group = groups.find(g => g.test(diffInMonths))
      if (!group) continue

      const key = group.label
      summary[key][monthLabel] += 1
      summary[key].total += 1
    }

    // Build final result
    const result = Object.values(summary)
    const grandTotal = result.reduce((sum, r) => sum + r.total, 0)

    for (const row of result) {
      row.percent = grandTotal > 0 ? (row.total / grandTotal * 100).toFixed(2) + '%' : '0%'
    }

    // Add total row
    const totalRow = { group: 'Total', total: grandTotal }
    monthLabels.forEach(m => {
      totalRow[m] = result.reduce((sum, r) => sum + r[m], 0)
    })
    totalRow.percent = '100%'

    res.json({
      year,
      table: result,
      total: totalRow
    })

  } catch (err) {
    console.error('❌ Error in getPeriodOfDirectLaborResignByYear:', err)
    res.status(500).json({ message: 'Server error' })
  }
}


// GET /api/hrss/excome/period-of-indirect-resign?year=2025
exports.getPeriodOfIndirectLaborResignByYear = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const directPositions = ['Sewer', 'Sewer-Jumper']
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Fetch resigned INDIRECT labor (exclude direct positions)
    const resigns = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $nin: directPositions }, // exclude direct labor
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      },
      joinDate: { $ne: null }
    })

    console.log(`📦 Resigned Indirect Labor (${year}):`, resigns.length)

    const groups = [
      { label: '< 2 M', test: d => d < 2 },
      { label: '2 - 6 Months', test: d => d >= 2 && d < 6 },
      { label: '6 Months- 1 Year', test: d => d >= 6 && d < 12 },
      { label: '1 Year- 2 Year', test: d => d >= 12 && d < 24 },
      { label: '2-5 Years', test: d => d >= 24 && d < 60 },
      { label: '> 5 Years', test: d => d >= 60 }
    ]

    const summary = {}
    for (const group of groups) {
      summary[group.label] = {
        group: group.label,
        total: 0
      }
      monthLabels.forEach(m => summary[group.label][m] = 0)
    }

    for (const emp of resigns) {
      const join = new Date(emp.joinDate)
      const resign = new Date(emp.resignDate)
      const diffInMonths =
        (resign.getFullYear() - join.getFullYear()) * 12 +
        (resign.getMonth() - join.getMonth())

      const monthIdx = resign.getMonth()
      const monthLabel = monthLabels[monthIdx]

      const group = groups.find(g => g.test(diffInMonths))
      if (!group) continue

      const key = group.label
      summary[key][monthLabel] += 1
      summary[key].total += 1
    }

    const result = Object.values(summary)
    const grandTotal = result.reduce((sum, r) => sum + r.total, 0)

    for (const row of result) {
      row.percent = grandTotal > 0 ? (row.total / grandTotal * 100).toFixed(2) + '%' : '0%'
    }

    const totalRow = { group: 'Total', total: grandTotal }
    monthLabels.forEach(m => {
      totalRow[m] = result.reduce((sum, r) => sum + r[m], 0)
    })
    totalRow.percent = '100%'

    res.json({
      year,
      table: result,
      total: totalRow
    })

  } catch (err) {
    console.error('❌ Error in getPeriodOfIndirectLaborResignByYear:', err)
    res.status(500).json({ message: 'Server error' })
  }
}



// GET /api/hrss/excome/period-of-direct-chart-resign?year=2025
exports.getPeriodOfDirectLaborChartResignByYear = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const directPositions = ['Sewer', 'Sewer-Jumper']

    // Fetch resigned direct labor
    const resigns = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $in: directPositions },
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      },
      joinDate: { $ne: null }
    })

    const groups = [
      { label: '< 2 M', test: d => d < 2 },
      { label: '2 - 6 Months', test: d => d >= 2 && d < 6 },
      { label: '6 Months- 1 Year', test: d => d >= 6 && d < 12 },
      { label: '1 Year- 2 Year', test: d => d >= 12 && d < 24 },
      { label: '2-5 Years', test: d => d >= 24 && d < 60 },
      { label: '> 5 Years', test: d => d >= 60 }
    ]

    const summary = {}
    for (const group of groups) {
      summary[group.label] = 0
    }

    for (const emp of resigns) {
      const join = new Date(emp.joinDate)
      const resign = new Date(emp.resignDate)
      const diffInMonths =
        (resign.getFullYear() - join.getFullYear()) * 12 +
        (resign.getMonth() - join.getMonth())

      const group = groups.find(g => g.test(diffInMonths))
      if (!group) continue

      summary[group.label] += 1
    }

    const total = Object.values(summary).reduce((sum, count) => sum + count, 0)

    const chartData = groups.map(g => {
      const count = summary[g.label]
      const percent = total > 0 ? (count / total * 100).toFixed(2) : '0.00'
      return {
        group: g.label,
        count,
        percent
      }
    })

    res.json({ year, total, data: chartData })
  } catch (err) {
    console.error('❌ Error in getPeriodOfDirectLaborChartResignByYear:', err)
    res.status(500).json({ message: 'Server error' })
  }
}


// GET /api/hrss/excome/period-of-indirect-chart-resign?year=2025
exports.getPeriodOfIndirectLaborChartResignByYear = async (req, res) => {
  try {
    const year = parseInt(req.query.year)
    const company = req.company

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' })
    }

    const directPositions = ['Sewer', 'Sewer-Jumper']

    const resigns = await Employee.find({
      company: { $in: Array.isArray(company) ? company : [company] },
      status: 'Resign',
      position: { $nin: directPositions }, // indirect only
      resignDate: {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      },
      joinDate: { $ne: null }
    })

    const groups = [
      { label: '< 2 M', test: d => d < 2 },
      { label: '2 - 6 Months', test: d => d >= 2 && d < 6 },
      { label: '6 Months- 1 Year', test: d => d >= 6 && d < 12 },
      { label: '1 Year- 2 Year', test: d => d >= 12 && d < 24 },
      { label: '2-5 Years', test: d => d >= 24 && d < 60 },
      { label: '> 5 Years', test: d => d >= 60 }
    ]

    const summary = {}
    for (const g of groups) summary[g.label] = 0

    for (const emp of resigns) {
      const join = new Date(emp.joinDate)
      const resign = new Date(emp.resignDate)
      const diff = (resign.getFullYear() - join.getFullYear()) * 12 + (resign.getMonth() - join.getMonth())
      const group = groups.find(g => g.test(diff))
      if (group) summary[group.label]++
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0)
    const data = groups.map(g => ({
      group: g.label,
      count: summary[g.label],
      percent: total > 0 ? (summary[g.label] / total * 100).toFixed(2) : '0.00'
    }))

    res.json({ year, total, data })
  } catch (err) {
    console.error('❌ Error in getPeriodOfIndirectLaborChartResignByYear:', err)
    res.status(500).json({ message: 'Server error' })
  }
}


// ✅ Monthly summary of Direct Labor join/resign
exports.getDirectLaborInAndOutByMonth = async (req, res) => {
  try {
    const { year } = req.query
    const company = req.company

    if (!year) return res.status(400).json({ message: 'Year is required' })
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' })

    const result = []

    for (let m = 0; m < 12; m++) {
      const start = moment.tz({ year, month: m }, 'Asia/Phnom_Penh').startOf('month').toDate()
      const end = moment.tz({ year, month: m }, 'Asia/Phnom_Penh').endOf('month').toDate()

      // ✅ Count Direct Labor JOINED (Sewer-Jumper + Sewer)
      const joined = await Employee.countDocuments({
        company,
        position: { $in: ['Sewer-Jumper', 'Sewer'] },
        joinDate: { $gte: start, $lte: end }
      })

      // ✅ Count Direct Labor RESIGNED (Employee model where status === 'Resign')
      const resigned = await Employee.countDocuments({
        company,
        position: { $in: ['Sewer-Jumper', 'Sewer'] },
        status: 'Resign',
        resignDate: { $gte: start, $lte: end }
      })

      const net = joined - resigned

      result.push({
        month: moment(start).format('MMM'),
        joined,
        resigned,
        net
      })
    }

    res.json({ year: parseInt(year), data: result })
  } catch (err) {
    console.error('❌ Error in getDirectLaborInAndOutByMonth:', err.message)
    res.status(500).json({ message: 'Server error', error: err.message })
  }
}
