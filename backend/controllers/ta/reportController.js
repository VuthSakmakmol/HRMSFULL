// backend/controllers/ta/reportController.js

const dayjs = require('dayjs');

const Roadmap = require('../../models/ta/Roadmap');
const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

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

  // Frontend sends 1-12.
  if (n >= 1 && n <= 12) return n - 1;

  // Support old 0-11 format.
  if (n >= 0 && n <= 11) return n;

  return null;
}

function normalizeQuarterParam(value) {
  if (value === null || value === undefined || value === '') return null;

  const n = Number(value);

  if (!Number.isFinite(n)) return null;

  // Frontend sends 1-4.
  if (n >= 1 && n <= 4) return n - 1;

  // Support old 0-3 format.
  if (n >= 0 && n <= 3) return n;

  return null;
}

function getQuarterMonths(qIndex) {
  return [qIndex * 3, qIndex * 3 + 1, qIndex * 3 + 2];
}

function buildColumns(view, year, selectedMonthIndex, selectedQuarterIndex) {
  if (view === 'year') {
    return [String(year)];
  }

  // Quarter YTD.
  // Q2 => Q1 | Q2 | YTD Total
  if (view === 'quarter') {
    if (selectedQuarterIndex !== null) {
      return [
        ...QUARTERS.slice(0, selectedQuarterIndex + 1),
        'YTD Total',
      ];
    }

    return QUARTERS;
  }

  // Month YTD.
  // Feb => Jan | Feb | YTD Total
  if (selectedMonthIndex !== null) {
    return [
      ...MONTHS.slice(0, selectedMonthIndex + 1),
      'YTD Total',
    ];
  }

  return MONTHS;
}

function initialArray(view, selectedMonthIndex, selectedQuarterIndex) {
  if (view === 'year') return [0];

  if (view === 'quarter') {
    if (selectedQuarterIndex !== null) {
      return Array(selectedQuarterIndex + 2).fill(0);
    }

    return Array(4).fill(0);
  }

  if (selectedMonthIndex !== null) {
    return Array(selectedMonthIndex + 2).fill(0);
  }

  return Array(12).fill(0);
}

function addCountToSeries(
  series,
  view,
  monthIndex,
  selectedMonthIndex,
  selectedQuarterIndex,
  amount = 1
) {
  const value = normalizeNumber(amount);

  if (view === 'year') {
    series[0] += value;
    return;
  }

  if (view === 'quarter') {
    const qIndex = Math.floor(monthIndex / 3);

    // Quarter YTD mode.
    if (selectedQuarterIndex !== null) {
      if (qIndex <= selectedQuarterIndex) {
        series[qIndex] += value;

        const totalIndex = selectedQuarterIndex + 1;
        series[totalIndex] += value;
      }

      return;
    }

    if (series[qIndex] !== undefined) {
      series[qIndex] += value;
    }

    return;
  }

  // Month YTD mode.
  if (selectedMonthIndex !== null) {
    if (monthIndex <= selectedMonthIndex) {
      series[monthIndex] += value;

      const totalIndex = selectedMonthIndex + 1;
      series[totalIndex] += value;
    }

    return;
  }

  if (series[monthIndex] !== undefined) {
    series[monthIndex] += value;
  }
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

function getRoadmapMonthIndex(value) {
  if (value === null || value === undefined || value === '') return -1;

  const n = Number(value);

  if (Number.isFinite(n)) {
    if (n >= 1 && n <= 12) return n - 1;
    if (n >= 0 && n <= 11) return n;
  }

  const raw = normalizeText(value);

  return MONTHS.findIndex(
    (monthName) => monthName.toLowerCase() === raw.toLowerCase()
  );
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

  const manualRoadmapSumByMonth = new Map();

  for (const roadmap of manualRoadmaps) {
    const monthIndex = getRoadmapMonthIndex(roadmap.month);

    if (monthIndex >= 0 && monthIndex <= 11) {
      const oldValue = manualRoadmapSumByMonth.get(monthIndex) || 0;
      manualRoadmapSumByMonth.set(
        monthIndex,
        oldValue + normalizeNumber(roadmap.roadmapHC)
      );
    }
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
      // White Collar roadmap planning = active requested HC + cancelled HC.
      roadmapHC = requestedHC + cancelledHC;
    } else if (type === 'Blue Collar') {
      // Blue Collar roadmap planning = manual Roadmap table.
      roadmapHC = normalizeNumber(manualRoadmapSumByMonth.get(i));
    } else {
      // All mode = Blue Collar manual planning + White Collar requisition demand.
      roadmapHC = normalizeNumber(manualRoadmapSumByMonth.get(i)) + requestedHC + cancelledHC;
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

function getQuarterTotal(key, quarterIndex, roadmapMap) {
  return getQuarterMonths(quarterIndex).reduce((sum, monthIndex) => {
    const monthName = getMonthName(monthIndex);
    return sum + normalizeNumber(roadmapMap[monthName]?.[key]);
  }, 0);
}

function getCombinedRoadmap(
  key,
  view,
  months,
  roadmapMap,
  selectedMonthIndex,
  selectedQuarterIndex
) {
  if (view === 'year') {
    return [
      months.reduce((sum, monthName) => {
        return sum + normalizeNumber(roadmapMap[monthName]?.[key]);
      }, 0),
    ];
  }

  if (view === 'quarter') {
    // Quarter YTD.
    if (selectedQuarterIndex !== null) {
      const values = QUARTERS
        .slice(0, selectedQuarterIndex + 1)
        .map((_, qIndex) => getQuarterTotal(key, qIndex, roadmapMap));

      const total = values.reduce((sum, value) => {
        return sum + normalizeNumber(value);
      }, 0);

      return [...values, total];
    }

    return [0, 1, 2, 3].map((qIndex) => {
      return getQuarterTotal(key, qIndex, roadmapMap);
    });
  }

  // Month YTD.
  if (selectedMonthIndex !== null) {
    const values = months
      .slice(0, selectedMonthIndex + 1)
      .map((monthName) => normalizeNumber(roadmapMap[monthName]?.[key]));

    const total = values.reduce((sum, value) => {
      return sum + normalizeNumber(value);
    }, 0);

    return [...values, total];
  }

  return months.map((monthName) => {
    return normalizeNumber(roadmapMap[monthName]?.[key]);
  });
}

function getFulfillPercent(
  view,
  months,
  roadmapMap,
  selectedMonthIndex,
  selectedQuarterIndex
) {
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
    if (selectedQuarterIndex !== null) {
      const values = QUARTERS.slice(0, selectedQuarterIndex + 1).map((_, qIndex) => {
        const actualSum = getQuarterTotal('actualHC', qIndex, roadmapMap);
        const roadmapSum = getQuarterTotal('roadmapHC', qIndex, roadmapMap);

        return calcPercent(actualSum, roadmapSum);
      });

      const totalActual = [0, 1, 2, 3]
        .slice(0, selectedQuarterIndex + 1)
        .reduce((sum, qIndex) => {
          return sum + getQuarterTotal('actualHC', qIndex, roadmapMap);
        }, 0);

      const totalRoadmap = [0, 1, 2, 3]
        .slice(0, selectedQuarterIndex + 1)
        .reduce((sum, qIndex) => {
          return sum + getQuarterTotal('roadmapHC', qIndex, roadmapMap);
        }, 0);

      return [...values, calcPercent(totalActual, totalRoadmap)];
    }

    return [0, 1, 2, 3].map((qIndex) => {
      const actualSum = getQuarterTotal('actualHC', qIndex, roadmapMap);
      const roadmapSum = getQuarterTotal('roadmapHC', qIndex, roadmapMap);

      return calcPercent(actualSum, roadmapSum);
    });
  }

  if (selectedMonthIndex !== null) {
    const values = months.slice(0, selectedMonthIndex + 1).map((monthName) => {
      return calcPercent(
        roadmapMap[monthName]?.actualHC,
        roadmapMap[monthName]?.roadmapHC
      );
    });

    const totalActual = months
      .slice(0, selectedMonthIndex + 1)
      .reduce((sum, monthName) => {
        return sum + normalizeNumber(roadmapMap[monthName]?.actualHC);
      }, 0);

    const totalRoadmap = months
      .slice(0, selectedMonthIndex + 1)
      .reduce((sum, monthName) => {
        return sum + normalizeNumber(roadmapMap[monthName]?.roadmapHC);
      }, 0);

    return [...values, calcPercent(totalActual, totalRoadmap)];
  }

  return months.map((monthName) => {
    return calcPercent(
      roadmapMap[monthName]?.actualHC,
      roadmapMap[monthName]?.roadmapHC
    );
  });
}

function buildActiveVacantValues(
  view,
  months,
  roadmapMap,
  selectedMonthIndex,
  selectedQuarterIndex
) {
  const roadmapValues = getCombinedRoadmap(
    'roadmapHC',
    view,
    months,
    roadmapMap,
    selectedMonthIndex,
    selectedQuarterIndex
  );

  const actualValues = getCombinedRoadmap(
    'actualHC',
    view,
    months,
    roadmapMap,
    selectedMonthIndex,
    selectedQuarterIndex
  );

  return roadmapValues.map((roadmapHC, index) => {
    return Math.max(0, normalizeNumber(roadmapHC) - normalizeNumber(actualValues[index]));
  });
}

function buildFillRateValues(
  view,
  months,
  roadmapMap,
  selectedMonthIndex,
  selectedQuarterIndex
) {
  const roadmapValues = getCombinedRoadmap(
    'roadmapHC',
    view,
    months,
    roadmapMap,
    selectedMonthIndex,
    selectedQuarterIndex
  );

  const actualValues = getCombinedRoadmap(
    'actualHC',
    view,
    months,
    roadmapMap,
    selectedMonthIndex,
    selectedQuarterIndex
  );

  return roadmapValues.map((roadmapHC, index) => {
    const roadmap = normalizeNumber(roadmapHC);
    const actual = normalizeNumber(actualValues[index]);

    if (roadmap <= 0) return '0%';

    return `${Math.round((actual / roadmap) * 100)}%`;
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

    const selectedMonthIndex =
      reportView === 'month'
        ? normalizeMonthParam(month)
        : null;

    const selectedQuarterIndex =
      reportView === 'quarter'
        ? normalizeQuarterParam(quarter)
        : null;

    const months = [...MONTHS];

    const columns = buildColumns(
      reportView,
      reportYear,
      selectedMonthIndex,
      selectedQuarterIndex
    );

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
      const appQuarterIndex = Math.floor(appMonth / 3);

      if (appYear !== reportYear) return false;

      if (!candidateMatchesType(candidate, reportType, reportSubType)) {
        return false;
      }

      // Quarter YTD.
      // Q2 means Q1 + Q2.
      if (reportView === 'quarter' && selectedQuarterIndex !== null) {
        return appQuarterIndex <= selectedQuarterIndex;
      }

      // Month YTD.
      // Feb means Jan + Feb.
      if (reportView === 'month' && selectedMonthIndex !== null) {
        return appMonth <= selectedMonthIndex;
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
      pipelineStages.map((stage) => [
        stage,
        initialArray(reportView, selectedMonthIndex, selectedQuarterIndex),
      ])
    );

    filtered.forEach((candidate) => {
      pipelineStages.forEach((stage) => {
        const d = candidate.progressDates?.get?.(stage);

        if (!d) return;

        const stageDate = dayjs(d);

        if (stageDate.year() !== reportYear) return;

        const stageMonth = stageDate.month();
        const stageQuarterIndex = Math.floor(stageMonth / 3);

        if (
          reportView === 'quarter' &&
          selectedQuarterIndex !== null &&
          stageQuarterIndex > selectedQuarterIndex
        ) {
          return;
        }

        if (
          reportView === 'month' &&
          selectedMonthIndex !== null &&
          stageMonth > selectedMonthIndex
        ) {
          return;
        }

        addCountToSeries(
          pipeline[stage],
          reportView,
          stageMonth,
          selectedMonthIndex,
          selectedQuarterIndex,
          1
        );
      });
    });

    const sourceCounts = Object.fromEntries(
      sources.map((source) => [
        source,
        initialArray(reportView, selectedMonthIndex, selectedQuarterIndex),
      ])
    );

    const sourceApplications = initialArray(
      reportView,
      selectedMonthIndex,
      selectedQuarterIndex
    );

    filtered.forEach((candidate) => {
      const appDate = candidate.progressDates?.get?.('Application');

      if (!appDate) return;

      const app = dayjs(appDate);
      const appMonth = app.month();
      const appQuarterIndex = Math.floor(appMonth / 3);
      const rawSource = normalizeText(candidate.applicationSource);

      if (!rawSource) return;

      if (
        reportView === 'quarter' &&
        selectedQuarterIndex !== null &&
        appQuarterIndex > selectedQuarterIndex
      ) {
        return;
      }

      if (
        reportView === 'month' &&
        selectedMonthIndex !== null &&
        appMonth > selectedMonthIndex
      ) {
        return;
      }

      for (const definedSource of sources) {
        if (rawSource.toLowerCase().includes(definedSource.toLowerCase())) {
          addCountToSeries(
            sourceCounts[definedSource],
            reportView,
            appMonth,
            selectedMonthIndex,
            selectedQuarterIndex,
            1
          );

          addCountToSeries(
            sourceApplications,
            reportView,
            appMonth,
            selectedMonthIndex,
            selectedQuarterIndex,
            1
          );

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

    const hireDateBuckets = initialArray(
      reportView,
      selectedMonthIndex,
      selectedQuarterIndex
    ).map(() => []);

    filtered.forEach((candidate) => {
      const applied = candidate.progressDates?.get?.('Application');
      const onboard = candidate.progressDates?.get?.('Onboard');

      if (!applied || !onboard) return;

      const onboardDate = dayjs(onboard);

      if (onboardDate.year() !== reportYear) return;

      const onboardMonth = onboardDate.month();
      const onboardQuarterIndex = Math.floor(onboardMonth / 3);
      const days = Math.max(0, onboardDate.diff(dayjs(applied), 'day'));

      if (
        reportView === 'quarter' &&
        selectedQuarterIndex !== null &&
        onboardQuarterIndex > selectedQuarterIndex
      ) {
        return;
      }

      if (
        reportView === 'month' &&
        selectedMonthIndex !== null &&
        onboardMonth > selectedMonthIndex
      ) {
        return;
      }

      if (reportView === 'year') {
        hireDateBuckets[0].push(days);
      } else if (reportView === 'quarter') {
        if (selectedQuarterIndex !== null) {
          hireDateBuckets[onboardQuarterIndex].push(days);
          hireDateBuckets[selectedQuarterIndex + 1].push(days);
        } else if (hireDateBuckets[onboardQuarterIndex]) {
          hireDateBuckets[onboardQuarterIndex].push(days);
        }
      } else if (selectedMonthIndex !== null) {
        hireDateBuckets[onboardMonth].push(days);
        hireDateBuckets[selectedMonthIndex + 1].push(days);
      } else if (hireDateBuckets[onboardMonth]) {
        hireDateBuckets[onboardMonth].push(days);
      }
    });

    const stats = {
      averageDaysToHire: hireDateBuckets.map((daysArr) => {
        if (!daysArr.length) return 0;

        return (
          daysArr.reduce((a, b) => a + b, 0) / daysArr.length
        ).toFixed(2);
      }),

      activeVacant: buildActiveVacantValues(
        reportView,
        months,
        roadmapMap,
        selectedMonthIndex,
        selectedQuarterIndex
      ),

      fillRate: buildFillRateValues(
        reportView,
        months,
        roadmapMap,
        selectedMonthIndex,
        selectedQuarterIndex,
        pipeline.Onboard
      ),
    };

    const rows = [
      {
        label: '0. Job Requisition',
        values: [],
        isHeader: true,
      },
      {
        label: 'Requested HC',
        values: getCombinedRoadmap(
          'requestedHC',
          reportView,
          months,
          roadmapMap,
          selectedMonthIndex,
          selectedQuarterIndex
        ),
      },
      {
        label: 'Roadmap HC from planning',
        values: getCombinedRoadmap(
          'roadmapHC',
          reportView,
          months,
          roadmapMap,
          selectedMonthIndex,
          selectedQuarterIndex
        ),
      },
      {
        label: 'Actual HC',
        values: getCombinedRoadmap(
          'actualHC',
          reportView,
          months,
          roadmapMap,
          selectedMonthIndex,
          selectedQuarterIndex
        ),
      },
      {
        label: 'Cancelled',
        values: getCombinedRoadmap(
          'cancelledHC',
          reportView,
          months,
          roadmapMap,
          selectedMonthIndex,
          selectedQuarterIndex
        ),
      },
      {
        label: 'Hiring Target HC',
        values: getCombinedRoadmap(
          'hiringTargetHC',
          reportView,
          months,
          roadmapMap,
          selectedMonthIndex,
          selectedQuarterIndex
        ),
      },
      {
        label: 'FullFill (%)',
        values: getFulfillPercent(
          reportView,
          months,
          roadmapMap,
          selectedMonthIndex,
          selectedQuarterIndex
        ),
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