// backend/controllers/ta/reportController.js

const dayjs = require('dayjs');

const Roadmap = require('../../models/ta/Roadmap');
const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const sources = [
  'FIF',
  'Banner / Job Announcement Board',
  'Brochure',
  'Telegram',
  'Facebook',
  'Job Portal',
  'LinkedIn',
  'HR Call',
  'Other',
  'Agency',
];

function getMonthName(i) {
  return MONTHS[i];
}

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

function getMonthDateRange(year, monthIndex) {
  const y = Number(year);

  return {
    start: new Date(y, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(y, monthIndex + 1, 1, 0, 0, 0, 0),
  };
}

function normalizeMonthParam(value) {
  if (value === null || value === undefined || value === '') return null;

  const n = Number(value);

  if (!Number.isFinite(n)) return null;

  // Frontend may send 1-12.
  if (n >= 1 && n <= 12) return n - 1;

  // Old logic may send 0-11.
  if (n >= 0 && n <= 11) return n;

  return null;
}

function getIndex(view, monthIndex) {
  if (view === 'year') return 0;
  if (view === 'quarter') return Math.floor(monthIndex / 3);
  return monthIndex;
}

function getQuarterMonths(qIndex) {
  return [qIndex * 3, qIndex * 3 + 1, qIndex * 3 + 2];
}

function initialArray(view) {
  if (view === 'year') return [0];
  if (view === 'quarter') return Array(4).fill(0);
  return Array(12).fill(0);
}

function buildColumns(view, year) {
  if (view === 'year') return [String(year)];
  if (view === 'quarter') return ['Q1', 'Q2', 'Q3', 'Q4'];
  return MONTHS;
}

function buildTypeMatch(type, subType) {
  const match = {};

  if (type && type !== 'All') {
    match.type = type;
  }

  if (type === 'Blue Collar') {
    match.subType = subType || 'Non-Sewer';
  }

  if (type === 'White Collar') {
    match.$or = [
      { subType: null },
      { subType: { $exists: false } },
      { subType: '' },
    ];
  }

  return match;
}

function candidateMatchesType(candidate, type, subType) {
  if (type === 'All') return true;

  if (candidate.type !== type) return false;

  if (type === 'Blue Collar') {
    return candidate.subType === subType;
  }

  return true;
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
    status: { $ne: 'Cancel' },
    openingDate: {
      $gte: range.start,
      $lt: range.end,
    },
    ...buildTypeMatch(type, subType),
  };

  return JobRequisition.find(match).select(
    '_id targetCandidates type subType openingDate status'
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
    ...buildTypeMatch(type, subType),
  };

  const rows = await JobRequisition.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: {
          $sum: {
            $ifNull: ['$targetCandidates', 0],
          },
        },
      },
    },
  ]);

  return normalizeNumber(rows[0]?.total);
}

async function countActualHCFromRequisitions({ company, requisitionIds }) {
  if (!Array.isArray(requisitionIds) || requisitionIds.length === 0) {
    return 0;
  }

  return Candidate.countDocuments({
    company,
    jobRequisitionId: { $in: requisitionIds },

    // Actual HC = onboarded only.
    // Do not use updatedAt because it can mix old data into another month.
    // Do not count all candidates in the month.
    $or: [
      { progress: 'Onboard' },
      { _onboardCounted: true },
    ],
  });
}

function sumTargetCandidates(requisitions = []) {
  return requisitions.reduce((sum, req) => {
    return sum + normalizeNumber(req.targetCandidates);
  }, 0);
}

async function getRoadmapMetricsByMonth({
  company,
  year,
  type,
  subType,
}) {
  const roadmapMap = {};

  for (const monthName of MONTHS) {
    roadmapMap[monthName] = {
      requestedHC: 0,
      roadmapHC: 0,
      actualHC: 0,
      cancelledHC: 0,
      hiringTargetHC: 0,
    };
  }

  const roadmapQuery = {
    company,
    year: Number(year),
  };

  if (type && type !== 'All') {
    roadmapQuery.type = type;
  }

  if (type === 'Blue Collar') {
    roadmapQuery.subType = subType || 'Non-Sewer';
  }

  // White Collar roadmap is virtual from JobRequisition, not manual Roadmap.
  if (type === 'White Collar') {
    roadmapQuery.type = '__NO_MANUAL_WHITE_COLLAR__';
  }

  const manualRoadmaps =
    type === 'Blue Collar' || type === 'All'
      ? await Roadmap.find(roadmapQuery)
      : [];

  const manualRoadmapByMonth = new Map();

  for (const r of manualRoadmaps) {
    manualRoadmapByMonth.set(r.month, r);
  }

  for (let i = 0; i < 12; i += 1) {
    const monthName = getMonthName(i);

    const requisitions = await getRequisitionsForRoadmapMonth({
      company,
      year,
      monthIndex: i,
      type,
      subType,
    });

    const requisitionIds = requisitions.map((req) => req._id);

    const requestedHC = sumTargetCandidates(requisitions);

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
      // White Collar roadmap is auto generated from active requisition targetCandidates.
      roadmapHC = requestedHC;
    } else if (type === 'Blue Collar') {
      // Blue Collar roadmap HC is manual planning from Roadmap table.
      const manual = manualRoadmapByMonth.get(monthName);
      roadmapHC = normalizeNumber(manual?.roadmapHC);
    } else {
      // All mode: combine manual roadmap + active requisition target.
      const manual = manualRoadmapByMonth.get(monthName);
      roadmapHC = normalizeNumber(manual?.roadmapHC) + requestedHC;
    }

    const hiringTargetHC = Math.max(0, roadmapHC - actualHC - cancelledHC);

    roadmapMap[monthName] = {
      requestedHC,
      roadmapHC,
      actualHC,
      cancelledHC,
      hiringTargetHC,
    };
  }

  return roadmapMap;
}

function getCombinedRoadmap(key, view, months, roadmapMap) {
  if (view === 'year') {
    return [
      months.reduce((sum, monthName) => {
        return sum + normalizeNumber(roadmapMap[monthName]?.[key]);
      }, 0),
    ];
  }

  if (view === 'quarter') {
    return [0, 1, 2, 3].map((q) => {
      return getQuarterMonths(q).reduce((sum, monthIndex) => {
        const monthName = getMonthName(monthIndex);
        return sum + normalizeNumber(roadmapMap[monthName]?.[key]);
      }, 0);
    });
  }

  return months.map((monthName) => {
    return normalizeNumber(roadmapMap[monthName]?.[key]);
  });
}

function getFulfillPercent(view, months, roadmapMap) {
  const calcPercent = (actualHC, roadmapHC) => {
    const actual = normalizeNumber(actualHC);
    const roadmap = normalizeNumber(roadmapHC);

    if (roadmap <= 0) return '0%';

    return `${Math.round((actual / roadmap) * 100)}%`;
  };

  if (view === 'year') {
    const totalActual = months.reduce((sum, monthName) => {
      return sum + normalizeNumber(roadmapMap[monthName]?.actualHC);
    }, 0);

    const totalRoadmap = months.reduce((sum, monthName) => {
      return sum + normalizeNumber(roadmapMap[monthName]?.roadmapHC);
    }, 0);

    return [calcPercent(totalActual, totalRoadmap)];
  }

  if (view === 'quarter') {
    return [0, 1, 2, 3].map((q) => {
      const qMonths = getQuarterMonths(q);

      const actualSum = qMonths.reduce((sum, monthIndex) => {
        const monthName = getMonthName(monthIndex);
        return sum + normalizeNumber(roadmapMap[monthName]?.actualHC);
      }, 0);

      const roadmapSum = qMonths.reduce((sum, monthIndex) => {
        const monthName = getMonthName(monthIndex);
        return sum + normalizeNumber(roadmapMap[monthName]?.roadmapHC);
      }, 0);

      return calcPercent(actualSum, roadmapSum);
    });
  }

  return months.map((monthName) => {
    return calcPercent(
      roadmapMap[monthName]?.actualHC,
      roadmapMap[monthName]?.roadmapHC
    );
  });
}

exports.getReport = async (req, res) => {
  try {
    const bodyOrQuery = req.method === 'POST' ? req.body : req.query;

    const {
      year = new Date().getFullYear(),
      type = 'White Collar',
      subType = null,
      view = 'month',
      quarter = null,
      month = null,
      company,
    } = bodyOrQuery;

    const normalizedCompany = normalizeCompany(company);

    if (!normalizedCompany) {
      return res.status(400).json({
        message: 'Company is required',
      });
    }

    const reportYear = Number(year);
    const reportType = normalizeText(type || 'White Collar');
    const reportSubType =
      reportType === 'Blue Collar'
        ? normalizeText(subType || 'Non-Sewer')
        : null;
    const reportView = normalizeText(view || 'month');
    const selectedMonthIndex = normalizeMonthParam(month);

    const months = [...MONTHS];
    const columns = buildColumns(reportView, reportYear);

    const roadmapMap = await getRoadmapMetricsByMonth({
      company: normalizedCompany,
      year: reportYear,
      type: reportType,
      subType: reportSubType,
    });

    const allCandidates = await Candidate.find({
      company: normalizedCompany,
    });

    const filtered = allCandidates.filter((candidate) => {
      const appDate = candidate.progressDates?.get?.('Application');

      if (!appDate) return false;

      const app = dayjs(appDate);
      const appYear = app.year();
      const appMonth = app.month();
      const appQuarter = Math.floor(appMonth / 3) + 1;

      if (appYear !== reportYear) return false;

      if (!candidateMatchesType(candidate, reportType, reportSubType)) {
        return false;
      }

      if (reportView === 'quarter' && quarter) {
        return appQuarter === Number(quarter);
      }

      if (reportView === 'month' && selectedMonthIndex !== null) {
        return appMonth === selectedMonthIndex;
      }

      return true;
    });

    const pipelineStages = [
      'Application',
      'ManagerReview',
      'Interview',
      'JobOffer',
      'Hired',
      'Onboard',
    ];

    const pipeline = Object.fromEntries(
      pipelineStages.map((stage) => [stage, initialArray(reportView)])
    );

    filtered.forEach((candidate) => {
      pipelineStages.forEach((stage) => {
        const d = candidate.progressDates?.get?.(stage);

        if (!d) return;

        const stageDate = dayjs(d);

        if (stageDate.year() !== reportYear) return;

        const stageMonth = stageDate.month();
        const idx = getIndex(reportView, stageMonth);

        if (pipeline[stage][idx] !== undefined) {
          pipeline[stage][idx] += 1;
        }
      });
    });

    const sourceCounts = Object.fromEntries(
      sources.map((source) => [source, initialArray(reportView)])
    );

    const sourceApplications = initialArray(reportView);

    filtered.forEach((candidate) => {
      const appDate = candidate.progressDates?.get?.('Application');

      if (!appDate) return;

      const app = dayjs(appDate);
      const appMonth = app.month();
      const idx = getIndex(reportView, appMonth);
      const rawSource = normalizeText(candidate.applicationSource);

      if (!rawSource) return;

      for (const definedSource of sources) {
        if (rawSource.toLowerCase().includes(definedSource.toLowerCase())) {
          if (sourceCounts[definedSource][idx] !== undefined) {
            sourceCounts[definedSource][idx] += 1;
            sourceApplications[idx] += 1;
          }

          break;
        }
      }
    });

    const sourcePercent = {};

    for (const source of sources) {
      sourcePercent[source] = sourceCounts[source].map((count, i) => {
        const total = sourceApplications[i] || 1;
        return `${Math.round((count / total) * 100)}%`;
      });
    }

    const stats = {
      averageDaysToHire: initialArray(reportView),
      activeVacant: initialArray(reportView),
      fillRate: initialArray(reportView),
    };

    const hireDates = {};

    filtered.forEach((candidate) => {
      const applied = candidate.progressDates?.get?.('Application');
      const onboard = candidate.progressDates?.get?.('Onboard');

      if (!applied || !onboard) return;

      const onboardDate = dayjs(onboard);

      if (onboardDate.year() !== reportYear) return;

      const onboardMonth = onboardDate.month();
      const idx = getIndex(reportView, onboardMonth);

      hireDates[idx] = hireDates[idx] || [];
      hireDates[idx].push(onboardDate.diff(dayjs(applied), 'day'));
    });

    stats.averageDaysToHire.forEach((_, i) => {
      const daysArr = hireDates[i] || [];

      if (daysArr.length) {
        stats.averageDaysToHire[i] = (
          daysArr.reduce((a, b) => a + b, 0) / daysArr.length
        ).toFixed(2);
      }

      if (reportView === 'year') {
        const totalTarget = months.reduce((sum, m) => {
          return sum + normalizeNumber(roadmapMap[m]?.hiringTargetHC);
        }, 0);

        const totalRoadmap = months.reduce((sum, m) => {
          return sum + normalizeNumber(roadmapMap[m]?.roadmapHC);
        }, 0);

        const totalActual = months.reduce((sum, m) => {
          return sum + normalizeNumber(roadmapMap[m]?.actualHC);
        }, 0);

        stats.activeVacant[i] = Math.max(0, totalRoadmap - totalActual);
        stats.fillRate[i] =
          totalTarget > 0
            ? `${Math.round((pipeline.Onboard[i] / totalTarget) * 100)}%`
            : '0%';
      } else if (reportView === 'quarter') {
        const qMonths = getQuarterMonths(i);

        const roadmapSum = qMonths.reduce((sum, monthIndex) => {
          const monthName = getMonthName(monthIndex);
          return sum + normalizeNumber(roadmapMap[monthName]?.roadmapHC);
        }, 0);

        const actualSum = qMonths.reduce((sum, monthIndex) => {
          const monthName = getMonthName(monthIndex);
          return sum + normalizeNumber(roadmapMap[monthName]?.actualHC);
        }, 0);

        const targetSum = qMonths.reduce((sum, monthIndex) => {
          const monthName = getMonthName(monthIndex);
          return sum + normalizeNumber(roadmapMap[monthName]?.hiringTargetHC);
        }, 0);

        stats.activeVacant[i] = Math.max(0, roadmapSum - actualSum);
        stats.fillRate[i] =
          targetSum > 0
            ? `${Math.round((pipeline.Onboard[i] / targetSum) * 100)}%`
            : '0%';
      } else {
        const monthName = months[i];

        const roadmapHC = normalizeNumber(roadmapMap[monthName]?.roadmapHC);
        const actualHC = normalizeNumber(roadmapMap[monthName]?.actualHC);
        const targetHC = normalizeNumber(roadmapMap[monthName]?.hiringTargetHC);

        stats.activeVacant[i] = Math.max(0, roadmapHC - actualHC);
        stats.fillRate[i] =
          targetHC > 0
            ? `${Math.round((pipeline.Onboard[i] / targetHC) * 100)}%`
            : '0%';
      }
    });

    const rows = [
      {
        label: '0. Job Requisition',
        values: [],
        isHeader: true,
      },
      {
        label: 'Requested HC',
        values: getCombinedRoadmap('requestedHC', reportView, months, roadmapMap),
      },
      {
        label: 'Roadmap HC from planning',
        values: getCombinedRoadmap('roadmapHC', reportView, months, roadmapMap),
      },
      {
        label: 'Actual HC',
        values: getCombinedRoadmap('actualHC', reportView, months, roadmapMap),
      },
      {
        label: 'Cancelled',
        values: getCombinedRoadmap('cancelledHC', reportView, months, roadmapMap),
      },
      {
        label: 'Hiring Target HC',
        values: getCombinedRoadmap('hiringTargetHC', reportView, months, roadmapMap),
      },
      {
        label: 'FullFill (%)',
        values: getFulfillPercent(reportView, months, roadmapMap),
      },

      {
        label: '1. Recruitment Pipeline',
        values: [],
        isHeader: true,
      },
      ...pipelineStages.map((stage, i) => ({
        label: `1.${i + 1} ${stage}`,
        values: pipeline[stage],
      })),

      {
        label: '2. Source of Application',
        values: [],
        isHeader: true,
      },
      ...sources.map((source) => ({
        label: source,
        values: sourceCounts[source],
        percents: sourcePercent[source],
        isSource: true,
      })),

      {
        label: '3. Vacancies Statistic',
        values: [],
        isHeader: true,
      },
      {
        label: '3.1 Average Day to Hire (Days)',
        values: stats.averageDaysToHire,
      },
      {
        label: '3.2 Active Vacant (Position)',
        values: stats.activeVacant,
      },
      {
        label: '3.3 Fill Rate (%)',
        values: stats.fillRate,
      },
    ];

    res.json({
      columns,
      rows,
      roadmap: roadmapMap,
    });
  } catch (err) {
    console.error('❌ Report Error:', err);

    res.status(500).json({
      message: 'Failed to load report',
      error: err.message,
    });
  }
};