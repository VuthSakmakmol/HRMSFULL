// backend/controllers/ta/dashboardController.js

const mongoose = require('mongoose');

const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');
const Roadmap = require('../../models/ta/Roadmap');

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function normalizeCompany(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function parseDateStart(value, fallbackYear) {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  return new Date(Number(fallbackYear), 0, 1, 0, 0, 0, 0);
}

function parseDateEnd(value, fallbackYear) {
  if (value) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      return d;
    }
  }

  return new Date(Number(fallbackYear), 11, 31, 23, 59, 59, 999);
}

function getMonthName(index) {
  return MONTHS[index];
}

function getMonthDateRange(year, monthIndex) {
  const y = Number(year);

  return {
    start: new Date(y, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(y, monthIndex + 1, 1, 0, 0, 0, 0),
  };
}

function getRoadmapMonthIndex(value) {
  if (value === null || value === undefined || value === '') return -1;

  const asNumber = Number(value);

  if (Number.isFinite(asNumber)) {
    // Supports old data like 1, 2, 3...
    if (asNumber >= 1 && asNumber <= 12) return asNumber - 1;

    // Supports old data like 0, 1, 2...
    if (asNumber >= 0 && asNumber <= 11) return asNumber;
  }

  const raw = normalizeText(value);

  return MONTHS.findIndex(
    (monthName) => monthName.toLowerCase() === raw.toLowerCase()
  );
}

function buildCandidateTypeMatch(type, subType) {
  const match = {};

  if (type && type !== 'All') {
    match.type = type;
  }

  if (type === 'Blue Collar') {
    match.subType = subType || 'Non-Sewer';
  }

  return match;
}

function buildJobTypeMatch(type, subType) {
  const match = {};

  if (type && type !== 'All') {
    match.type = type;
  }

  if (type === 'Blue Collar') {
    match.subType = subType || 'Non-Sewer';
  }

  return match;
}

function buildCandidateBaseMatch({
  company,
  type,
  subType,
  recruiter,
}) {
  const match = {
    company,
    ...buildCandidateTypeMatch(type, subType),
  };

  if (recruiter) {
    match.recruiter = normalizeText(recruiter);
  }

  return match;
}

function buildCandidateBasePipeline({
  company,
  type,
  subType,
  recruiter,
  departmentId,
}) {
  const pipeline = [
    {
      $match: buildCandidateBaseMatch({
        company,
        type,
        subType,
        recruiter,
      }),
    },
  ];

  // Candidate does not directly store departmentId.
  // So for department filter, lookup JobRequisition by jobRequisitionId.
  if (departmentId && mongoose.isValidObjectId(departmentId)) {
    pipeline.push(
      {
        $lookup: {
          from: JobRequisition.collection.name,
          localField: 'jobRequisitionId',
          foreignField: '_id',
          as: 'requisition',
        },
      },
      {
        $unwind: {
          path: '$requisition',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'requisition.departmentId': new mongoose.Types.ObjectId(departmentId),
        },
      }
    );
  }

  return pipeline;
}

function buildJobBaseMatch({
  company,
  type,
  subType,
  departmentId,
}) {
  const match = {
    company,
    ...buildJobTypeMatch(type, subType),
  };

  if (departmentId && mongoose.isValidObjectId(departmentId)) {
    match.departmentId = new mongoose.Types.ObjectId(departmentId);
  }

  return match;
}

async function countStageCandidates({
  company,
  type,
  subType,
  recruiter,
  departmentId,
  stage,
  startDate,
  endDate,
}) {
  const pipeline = buildCandidateBasePipeline({
    company,
    type,
    subType,
    recruiter,
    departmentId,
  });

  const stageDateExpression =
    stage === 'Application'
      ? {
          $ifNull: [
            `$progressDates.${stage}`,
            '$createdAt',
          ],
        }
      : `$progressDates.${stage}`;

  pipeline.push(
    {
      $addFields: {
        stageDateForFilter: stageDateExpression,
      },
    },
    {
      $match: {
        stageDateForFilter: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $count: 'count',
    }
  );

  const rows = await Candidate.aggregate(pipeline);
  return normalizeNumber(rows[0]?.count);
}

async function getApplicationSourceData({
  company,
  type,
  subType,
  recruiter,
  departmentId,
  startDate,
  endDate,
}) {
  const pipeline = buildCandidateBasePipeline({
    company,
    type,
    subType,
    recruiter,
    departmentId,
  });

  pipeline.push(
    {
      $addFields: {
        applicationDateForFilter: {
          $ifNull: [
            '$progressDates.Application',
            '$createdAt',
          ],
        },
        sourceForGroup: {
          $ifNull: [
            '$applicationSource',
            'Unknown',
          ],
        },
      },
    },
    {
      $match: {
        applicationDateForFilter: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$sourceForGroup',
        count: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        count: -1,
      },
    }
  );

  const rows = await Candidate.aggregate(pipeline);

  return {
    labels: rows.map((row) => row._id || 'Unknown'),
    counts: rows.map((row) => normalizeNumber(row.count)),
  };
}

async function getDecisionData({
  company,
  type,
  subType,
  recruiter,
  departmentId,
  startDate,
  endDate,
}) {
  const pipeline = buildCandidateBasePipeline({
    company,
    type,
    subType,
    recruiter,
    departmentId,
  });

  pipeline.push(
    {
      $addFields: {
        applicationDateForFilter: {
          $ifNull: [
            '$progressDates.Application',
            '$createdAt',
          ],
        },
        decisionForGroup: {
          $ifNull: [
            '$hireDecision',
            'Candidate in Process',
          ],
        },
      },
    },
    {
      $match: {
        applicationDateForFilter: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: '$decisionForGroup',
        count: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        count: -1,
      },
    }
  );

  const rows = await Candidate.aggregate(pipeline);

  return {
    labels: rows.map((row) => row._id || 'Candidate in Process'),
    counts: rows.map((row) => normalizeNumber(row.count)),
  };
}

async function getMonthlyApplicationData({
  company,
  type,
  subType,
  recruiter,
  departmentId,
  year,
}) {
  const reportYear = Number(year || new Date().getFullYear());

  const yearStart = new Date(reportYear, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(reportYear, 11, 31, 23, 59, 59, 999);

  const pipeline = buildCandidateBasePipeline({
    company,
    type,
    subType,
    recruiter,
    departmentId,
  });

  pipeline.push(
    {
      $addFields: {
        applicationDateForMonth: {
          $ifNull: [
            '$progressDates.Application',
            '$createdAt',
          ],
        },
      },
    },
    {
      $match: {
        applicationDateForMonth: {
          $gte: yearStart,
          $lte: yearEnd,
        },
      },
    },
    {
      $group: {
        _id: {
          month: {
            $month: '$applicationDateForMonth',
          },
        },
        count: {
          $sum: 1,
        },
      },
    },
    {
      $sort: {
        '_id.month': 1,
      },
    }
  );

  const rows = await Candidate.aggregate(pipeline);

  const counts = Array(12).fill(0);

  for (const row of rows) {
    const monthIndex = Number(row._id?.month) - 1;

    if (monthIndex >= 0 && monthIndex <= 11) {
      counts[monthIndex] = normalizeNumber(row.count);
    }
  }

  return {
    labels: MONTHS,
    counts,
  };
}

async function getRequisitionsForRoadmapMonth({
  company,
  year,
  monthIndex,
  type,
  subType,
}) {
  const range = getMonthDateRange(year, monthIndex);

  const match = {
    company,
    status: {
      $ne: 'Cancel',
    },
    openingDate: {
      $gte: range.start,
      $lt: range.end,
    },
    ...buildJobTypeMatch(type, subType),
  };

  return JobRequisition.find(match).select(
    '_id targetCandidates status type subType openingDate'
  );
}

async function sumCancelledHCForRoadmapMonth({
  company,
  year,
  monthIndex,
  type,
  subType,
}) {
  const range = getMonthDateRange(year, monthIndex);

  const match = {
    company,
    status: 'Cancel',
    openingDate: {
      $gte: range.start,
      $lt: range.end,
    },
    ...buildJobTypeMatch(type, subType),
  };

  const rows = await JobRequisition.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $ifNull: [
              '$targetCandidates',
              0,
            ],
          },
        },
      },
    },
  ]);

  return normalizeNumber(rows[0]?.total);
}

async function countActualHCFromRequisitions({
  company,
  requisitionIds,
}) {
  if (!Array.isArray(requisitionIds) || requisitionIds.length === 0) {
    return 0;
  }

  return Candidate.countDocuments({
    company,
    jobRequisitionId: {
      $in: requisitionIds,
    },
    $or: [
      {
        progress: 'Onboard',
      },
      {
        _onboardCounted: true,
      },
    ],
  });
}

function sumTargetCandidates(requisitions = []) {
  return requisitions.reduce((sum, req) => {
    return sum + normalizeNumber(req.targetCandidates);
  }, 0);
}

async function getRoadmapMetrics({
  company,
  year,
  type,
  subType,
}) {
  const roadmap = {
    requestedHC: Array(12).fill(0),
    roadmapHC: Array(12).fill(0),
    actualHC: Array(12).fill(0),
    cancelledHC: Array(12).fill(0),
    hiringTargetHC: Array(12).fill(0),
    fulfillPercent: Array(12).fill('0%'),
  };

  const manualRoadmapQuery = {
    company,
    year: Number(year),
    type: 'Blue Collar',
  };

  if (type === 'Blue Collar') {
    manualRoadmapQuery.subType = subType || 'Non-Sewer';
  }

  const manualRoadmaps =
    type === 'Blue Collar' || type === 'All'
      ? await Roadmap.find(manualRoadmapQuery)
      : [];

  const manualRoadmapByMonth = new Map();

  for (const item of manualRoadmaps) {
    const monthIndex = getRoadmapMonthIndex(item.month);

    if (monthIndex >= 0 && monthIndex <= 11) {
      manualRoadmapByMonth.set(monthIndex, item);
    }
  }

  for (let i = 0; i < 12; i += 1) {
    const activeRequisitions = await getRequisitionsForRoadmapMonth({
      company,
      year,
      monthIndex: i,
      type,
      subType,
    });

    const requisitionIds = activeRequisitions.map((req) => req._id);
    const requestedHC = sumTargetCandidates(activeRequisitions);

    const [actualHC, cancelledHC] = await Promise.all([
      countActualHCFromRequisitions({
        company,
        requisitionIds,
      }),
      sumCancelledHCForRoadmapMonth({
        company,
        year,
        monthIndex: i,
        type,
        subType,
      }),
    ]);

    let roadmapHC = 0;

    if (type === 'White Collar') {
      // White Collar planning is generated from all requisition demand:
      // active requested HC + cancelled HC.
      roadmapHC = requestedHC + cancelledHC;
    } else if (type === 'Blue Collar') {
      // Blue Collar planning comes from manual Roadmap table.
      const manualRoadmap = manualRoadmapByMonth.get(i);
      roadmapHC = normalizeNumber(manualRoadmap?.roadmapHC);
    } else {
      const manualRoadmap = manualRoadmapByMonth.get(i);
      roadmapHC = normalizeNumber(manualRoadmap?.roadmapHC) + requestedHC + cancelledHC;
    }

    const hiringTargetHC = Math.max(0, roadmapHC - actualHC - cancelledHC);
    const fulfillPercent =
      roadmapHC > 0
        ? `${Math.round((actualHC / roadmapHC) * 100)}%`
        : '0%';

    roadmap.requestedHC[i] = requestedHC;
    roadmap.roadmapHC[i] = roadmapHC;
    roadmap.actualHC[i] = actualHC;
    roadmap.cancelledHC[i] = cancelledHC;
    roadmap.hiringTargetHC[i] = hiringTargetHC;
    roadmap.fulfillPercent[i] = fulfillPercent;
  }

  return roadmap;
}

async function getKpiData({
  company,
  type,
  subType,
  departmentId,
  startDate,
  endDate,
}) {
  const jobMatch = {
    ...buildJobBaseMatch({
      company,
      type,
      subType,
      departmentId,
    }),
    openingDate: {
      $lte: endDate,
    },
  };

  const allJobs = await JobRequisition.find(jobMatch);

  const totalRequisitions = allJobs.length;
  const filledPositions = allJobs.filter((job) => job.status === 'Filled').length;
  const activeVacancies = allJobs.filter((job) => job.status === 'Vacant').length;

  const jobIds = allJobs.map((job) => job._id);

  const onboardedCandidates = jobIds.length
    ? await Candidate.find({
        company,
        jobRequisitionId: {
          $in: jobIds,
        },
        ...buildCandidateTypeMatch(type, subType),
        $or: [
          {
            progress: 'Onboard',
          },
          {
            _onboardCounted: true,
          },
        ],
        'progressDates.Application': {
          $exists: true,
        },
        'progressDates.Onboard': {
          $exists: true,
        },
      })
    : [];

  let totalHiringCost = 0;
  let totalDaysToHire = 0;
  let validCount = 0;

  for (const candidate of onboardedCandidates) {
    const job = allJobs.find((item) => {
      return item._id.toString() === candidate.jobRequisitionId?.toString();
    });

    if (!job || !normalizeNumber(job.targetCandidates)) {
      continue;
    }

    const perCandidateCost =
      normalizeNumber(job.hiringCost) / normalizeNumber(job.targetCandidates);

    totalHiringCost += perCandidateCost;

    const progressDates =
      candidate.progressDates instanceof Map
        ? Object.fromEntries(candidate.progressDates)
        : candidate.progressDates;

    const applicationDate = new Date(progressDates?.Application);
    const onboardDate = new Date(progressDates?.Onboard);

    if (
      !Number.isNaN(applicationDate.getTime()) &&
      !Number.isNaN(onboardDate.getTime()) &&
      onboardDate >= startDate &&
      onboardDate <= endDate
    ) {
      const days = Math.floor(
        (onboardDate - applicationDate) / (1000 * 60 * 60 * 24)
      );

      totalDaysToHire += Math.max(0, days);
      validCount += 1;
    }
  }

  const onboarded = onboardedCandidates.length;
  const costPerHire = onboarded > 0 ? totalHiringCost / onboarded : 0;

  const avgDaysToHire =
    validCount > 0
      ? Math.round(totalDaysToHire / validCount)
      : 0;

  const totalTarget = allJobs
    .filter((job) => job.status !== 'Cancel')
    .reduce((sum, job) => {
      return sum + normalizeNumber(job.targetCandidates);
    }, 0);

  const fillRate =
    totalTarget > 0
      ? Number(((onboarded / totalTarget) * 100).toFixed(1))
      : 0;

  return {
    totalRequisitions,
    filledPositions,
    hiringCost: Math.round(totalHiringCost),
    costPerHire: Number(costPerHire.toFixed(2)),
    averageDaysToHire: avgDaysToHire,
    activeVacancies,
    fillRate,
  };
}

exports.getDashboardStats = async (req, res) => {
  try {
    const {
      type = 'White Collar',
      subType = null,
      recruiter = null,
      departmentId = null,
      from = null,
      to = null,
      year = new Date().getFullYear(),
    } = req.body || {};

    const company = normalizeCompany(req.company || req.body.company);

    if (!company) {
      return res.status(400).json({
        message: 'Company is required',
      });
    }

    const reportYear = Number(year || new Date().getFullYear());
    const reportType = normalizeText(type || 'White Collar');
    const reportSubType =
      reportType === 'Blue Collar'
        ? normalizeText(subType || 'Non-Sewer')
        : null;

    const startDate = parseDateStart(from, reportYear);
    const endDate = parseDateEnd(to, reportYear);

    const pipelineStages = [
      'Application',
      'ManagerReview',
      'Interview',
      'JobOffer',
      'Hired',
      'Onboard',
    ];

    const pipeline = {};

    for (const stage of pipelineStages) {
      pipeline[stage] = await countStageCandidates({
        company,
        type: reportType,
        subType: reportSubType,
        recruiter,
        departmentId,
        stage,
        startDate,
        endDate,
      });
    }

    const [sources, decisions, monthly, roadmap, kpi] = await Promise.all([
      getApplicationSourceData({
        company,
        type: reportType,
        subType: reportSubType,
        recruiter,
        departmentId,
        startDate,
        endDate,
      }),

      getDecisionData({
        company,
        type: reportType,
        subType: reportSubType,
        recruiter,
        departmentId,
        startDate,
        endDate,
      }),

      getMonthlyApplicationData({
        company,
        type: reportType,
        subType: reportSubType,
        recruiter,
        departmentId,
        year: reportYear,
      }),

      getRoadmapMetrics({
        company,
        year: reportYear,
        type: reportType,
        subType: reportSubType,
      }),

      getKpiData({
        company,
        type: reportType,
        subType: reportSubType,
        departmentId,
        startDate,
        endDate,
      }),
    ]);

    res.json({
      pipeline,
      sources,
      decisions,
      kpi,
      monthly,
      roadmap,
    });
  } catch (err) {
    console.error('❌ Dashboard Stats Error:', err);

    res.status(500).json({
      message: 'Failed to fetch dashboard stats',
      error: err.message,
    });
  }
};