const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');

exports.getDashboardStats = async (req, res) => {
  try {
    const {
      type,
      subType,
      recruiter,
      departmentId,
      from,
      to,
      year
    } = req.body;

    // 👇 Adjust company filter based on role
    const role = req.user?.role;
    const userCompany = req.user?.company;
    const company = role === 'GeneralManager' ? req.body.company : userCompany;

    if (!company) {
      return res.status(400).json({ message: 'Company is required' });
    }

    const baseFilter = {
      company: company.trim().toUpperCase(),
      type,
      ...(subType ? { subType } : {})
    };

    if (recruiter) baseFilter.recruiter = recruiter;
    if (departmentId) baseFilter.departmentId = departmentId;

    // 🔹 Get pipeline stages
    const pipelineStages = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const pipeline = {};
    for (const stage of pipelineStages) {
      pipeline[stage] = await Candidate.countDocuments({
        ...baseFilter,
        progress: stage,
        createdAt: { $gte: new Date(from), $lte: new Date(to) },
      });
    }

    // 🔹 Get application sources
    const sourceAgg = await Candidate.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: new Date(from), $lte: new Date(to) } } },
      {
        $group: {
          _id: '$applicationSource',
          count: { $sum: 1 }
        }
      }
    ]);

    const sources = {
      labels: sourceAgg.map(s => s._id),
      counts: sourceAgg.map(s => s.count)
    };

    // 🔹 Get hire decisions
    const decisionAgg = await Candidate.aggregate([
      { $match: { ...baseFilter, createdAt: { $gte: new Date(from), $lte: new Date(to) } } },
      {
        $group: {
          _id: '$hireDecision',
          count: { $sum: 1 }
        }
      }
    ]);

    const decisions = {
      labels: decisionAgg.map(d => d._id),
      counts: decisionAgg.map(d => d.count)
    };

    // 🔹 KPI Calculation
    const allJobs = await JobRequisition.find({
      ...baseFilter,
      createdAt: { $lte: new Date(to) }
    });

    const totalRequisitions = allJobs.length;
    const filledPositions = allJobs.filter(j => j.status === 'Filled').length;
    const totalHiringCost = allJobs.reduce((sum, j) => sum + (j.hiringCost || 0), 0);
    const onboarded = await Candidate.countDocuments({
      ...baseFilter,
      progress: 'Onboard',
      _onboardCounted: true
    });

    const costPerHire = onboarded ? totalHiringCost / onboarded : 0;
    const activeVacancies = allJobs.filter(j => j.status === 'Vacant').length;

    const kpi = {
      totalRequisitions,
      filledPositions,
      totalHiringCost: Math.round(totalHiringCost),
      costPerHire: parseFloat(costPerHire.toFixed(2)),
      avgDaysToHire: 0, // Placeholder, calculate if needed
      activeVacancies
    };

    // 🔹 Monthly Applications Chart (if year provided)
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthlyCounts = Array(12).fill(0);

    if (year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${year}-12-31`);
      const monthlyAgg = await Candidate.aggregate([
        {
          $match: {
            ...baseFilter,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 }
          }
        }
      ]);

      monthlyAgg.forEach(m => {
        monthlyCounts[m._id - 1] = m.count;
      });
    }

    const monthly = {
      labels: months,
      counts: monthlyCounts
    };

    res.json({
      pipeline,
      sources,
      decisions,
      kpi,
      monthly
    });

  } catch (err) {
    console.error('❌ Dashboard Stats Error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
