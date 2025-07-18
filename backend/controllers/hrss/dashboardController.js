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


exports.getPositionMonthlyCounts = async (req, res) => {
  // 1) confirm what we're matching
  console.log('🔍 company filters:', { fromAuth: req.company, fromQuery: req.query.company });

  // 2) pick whichever one you actually want
  const company = req.company || req.query.company;
  if (!company) {
    return res.status(400).json({ error: 'Company is required' });
  }

  try {
    const positions = ['Sewer','Jumper'];
    const agg = await Employee.aggregate([
      { $match: {
          company,
          position:  { $in: positions },
          joinDate:  { $exists: true, $ne: null }
      }},
      { $project: {
          month:    { $dateToString: { format:'%Y-%m', date:'$joinDate' } },
          position: 1
      }},
      { $group: {
          _id:   { month:'$month', position:'$position' },
          count: { $sum: 1 }
      }},
      { $group: {
          _id:    '$_id.month',
          counts: { $push: { position:'$_id.position', count:'$count' } }
      }},
      { $sort: { _id: 1 } }
    ]);

    // pivot
    const labels   = [];
    const sewer    = [];
    const jumper   = [];
    const combined = [];

    agg.forEach(b => {
      labels.push(b._id);
      const s = b.counts.find(x=>x.position==='Sewer')?.count || 0;
      const j = b.counts.find(x=>x.position==='Jumper')?.count|| 0;
      sewer.push(s);
      jumper.push(j);
      combined.push(s+j);
    });

    console.log('📊 positionMonthlyCounts:', { labels, sewer, jumper, combined });
    return res.json({ labels, sewer, jumper, combined });
  } catch (err) {
    console.error('❌ Error in getPositionMonthlyCounts:', err);
    return res.status(500).json({ error: 'Failed to fetch position monthly counts' });
  }
}


// ─── Merchandising: Monthly Join Trend ────────────────────────────
exports.getMerchandisingMonthlyJoin = async (req, res) => {
  try {
    const company = req.company || req.query.company
    if (!company) {
      return res.status(400).json({ error: 'Company is required' })
    }

    // aggregate by joinDate (or fallback to createdAt) into YYYY-MM buckets
    const data = await Employee.aggregate([
      { $match: { company, department: 'Merchandising' } },
      { $project: {
          month: {
            $dateToString: {
              format: '%Y-%m',
              date: { $ifNull: ['$joinDate', '$createdAt'] }
            }
          }
      }},
      { $group: {
          _id:   '$month',
          count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ])

    return res.json(data)
  } catch (err) {
    console.error('❌ getMerchandisingMonthlyJoin error:', err)
    return res.status(500).json({ error: 'Failed to fetch merchandising monthly joins' })
  }
}

// ─── Monthly join trend for “other” positions ────────────────────
exports.getOtherPositionsMonthlyJoin = async (req, res) => {
  try {
    const company    = req.company || req.query.company
    if (!company) return res.status(400).json({ error: 'Company is required' })

    const excludeDept = 'Merchandising'
    const excludePos  = ['Sewer','Jumper']

    // 1) aggregate by month+position
    const agg = await Employee.aggregate([
      { $match: {
          company,
          department: { $ne: excludeDept },
          position:   { $nin: excludePos },
          joinDate:   { $exists:true, $ne:null }
      }},
      { $group: {
          _id:   { month:'$joinDate', position:'$position' },
          count: { $sum: 1 }
      }},
      { $project: {
          month:    { $dateToString:{ format:'%Y-%m', date:'$_id.month' } },
          position: '$_id.position',
          count:    1
      }},
      { $sort: { month: 1 } }
    ])

    // 2) pivot into labels + series
    const months    = Array.from(new Set(agg.map(d => d.month))).sort()
    const positions = Array.from(new Set(agg.map(d => d.position))).sort()

    const series = positions.map(pos => ({
      name: pos,
      data: months.map(m => {
        const found = agg.find(d => d.month === m && d.position === pos)
        return found ? found.count : 0
      })
    }))

    res.json({ labels: months, series })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch other positions monthly joins' })
  }
}
