const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');
const Roadmap = require('../../models/ta/Roadmap');

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

    const company = req.company; // ✅ company set securely by authorizeCompanyAccess middleware

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

    // 🔹 Roadmap Summary
    const roadmapAgg = await Roadmap.aggregate([
      {
        $match: {
          company: company.trim().toUpperCase(),
          type,
          ...(subType ? { subType } : { $or: [{ subType: null }, { subType: '' }] }),
          year: parseInt(year)
        }
      },
      {
        $group: {
          _id: "$month",
          roadmapHC: { $sum: "$roadmapHC" },
          actualHC: { $sum: "$actualHC" },
          hiringTargetHC: { $sum: "$hiringTargetHC" }
        }
      }
    ]);

    const roadmap = {
      roadmapHC: Array(12).fill(0),
      actualHC: Array(12).fill(0),
      hiringTargetHC: Array(12).fill(0)
    };

    roadmapAgg.forEach(entry => {
      const index = parseInt(entry._id) - 1;
      roadmap.roadmapHC[index] = entry.roadmapHC || 0;
      roadmap.actualHC[index] = entry.actualHC || 0;
      roadmap.hiringTargetHC[index] = entry.hiringTargetHC || 0;
    });


    // 🔹 Get pipeline stages
    const pipelineStages = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const pipeline = {};
    for (const stage of pipelineStages) {
      pipeline[stage] = await Candidate.countDocuments({
        ...baseFilter,
        [`progressDates.${stage}`]: { $exists: true },
        createdAt: { $gte: new Date(from), $lte: new Date(to) }
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
    const activeVacancies = allJobs.filter(j => j.status === 'Vacant').length;

    const onboardedCandidates = await Candidate.find({
      ...baseFilter,
      progress: 'Onboard',
      _onboardCounted: true,
      'progressDates.Application': { $exists: true },
      'progressDates.Onboard': { $exists: true }
    });

    let totalHiringCost = 0;
    let totalDaysToHire = 0;
    let validCount = 0;

    for (const candidate of onboardedCandidates) {
      const job = allJobs.find(j => j._id.toString() === candidate.jobRequisitionId?.toString());
      if (!job || !job.targetCandidates || job.targetCandidates === 0) continue;

      const perCandidateCost = job.hiringCost / job.targetCandidates;
      totalHiringCost += perCandidateCost;

      const progress =
        candidate.progressDates instanceof Map
          ? Object.fromEntries(candidate.progressDates)
          : candidate.progressDates;

      const appRaw = progress?.Application;
      const onboardRaw = progress?.Onboard;

      if (appRaw && onboardRaw) {
        const appDate = new Date(appRaw);
        const onboardDate = new Date(onboardRaw);

        if (!isNaN(appDate) && !isNaN(onboardDate)) {
          const days = Math.floor((onboardDate - appDate) / (1000 * 60 * 60 * 24));
          totalDaysToHire += days;
          validCount++;
        } else {
          console.warn('⚠️ Invalid date conversion for:', {
            name: candidate.fullName,
            appRaw,
            onboardRaw
          });
        }
      } else {
        console.warn('⚠️ Missing progress dates for:', {
          name: candidate.fullName,
          progressDates: progress
        });
      }
    }

    const onboarded = onboardedCandidates.length;
    const costPerHire = onboarded > 0 ? totalHiringCost / onboarded : 0;
    const avgDaysToHire = validCount > 0 ? Math.round(totalDaysToHire / validCount) : 0;
    const totalTarget = allJobs.reduce((sum, j) => sum + (j.targetCandidates || 0), 0);
    const fillRate = totalTarget > 0 ? parseFloat(((onboarded / totalTarget) * 100).toFixed(1)) : 0;

    const kpi = {
      totalRequisitions,
      filledPositions,
      hiringCost: Math.round(totalHiringCost),
      costPerHire: parseFloat(costPerHire.toFixed(2)),
      averageDaysToHire: avgDaysToHire,
      activeVacancies,
      fillRate
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
            'progressDates.Application': { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $month: '$progressDates.Application' },
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

    const result = {
      pipeline,
      sources,
      decisions,
      kpi,
      monthly,
      roadmap
    };

    // ✅ Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('dashboardUpdate', { company: company.trim().toUpperCase(), data: result });
    } else {
      console.warn('⚠️ Socket.io instance not attached; dashboard updates not emitted.');
    }

    res.json(result);

  } catch (err) {
    console.error('❌ Dashboard Stats Error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: err.message });
  }
};
