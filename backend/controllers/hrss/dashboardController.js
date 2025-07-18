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

