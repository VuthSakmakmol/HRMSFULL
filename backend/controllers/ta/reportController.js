const dayjs = require('dayjs');
const Roadmap = require('../../models/ta/Roadmap');
const Candidate = require('../../models/ta/Candidate');

const sources = [
  'FIF', 'Banner / Job Announcement Board', 'Brochure', 'Telegram', 'Facebook',
  'Job Portal', 'LinkedIn', 'HR Call', 'Other', 'Agency'
];

const getMonthName = (i) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i];

exports.getReport = async (req, res) => {
  try {
    const {
      year = new Date().getFullYear(),
      type = 'White Collar',
      subType = null,
      view = 'month',
      quarter = null,
      month = null,
      company = null
    } = req.method === 'POST' ? req.body : req.query;

    const months = Array.from({ length: 12 }, (_, i) => getMonthName(i));
    let columns = months;
    if (view === 'quarter') columns = ['Q1', 'Q2', 'Q3', 'Q4'];
    if (view === 'year') columns = [String(year)];

    const roadmapQuery = { year, type };
    if (type === 'Blue Collar' && subType) roadmapQuery.subType = subType;
    if (company) roadmapQuery.company = company;

    const roadmapData = await Roadmap.find(roadmapQuery);
    const roadmapMap = {};
    months.forEach(month => {
      const r = roadmapData.find(x => x.month === month);
      roadmapMap[month] = {
        roadmapHC: r?.roadmapHC || 0,
        actualHC: r?.actualHC || 0,
        hiringTargetHC: r?.hiringTargetHC || 0
      };
    });

    const candidateQuery = {};
    if (company) candidateQuery.company = company;
    const allCandidates = await Candidate.find(candidateQuery).populate('jobRequisitionId');

    const filtered = allCandidates.filter(c => {
      if (!c.progressDates?.Application) return false;
      const applicationDate = dayjs(c.progressDates.Application);
      const applicationYear = applicationDate.year();
      const applicationMonth = applicationDate.month();
      const applicationQuarter = Math.floor(applicationMonth / 3) + 1;

      const matchesYear = applicationYear === +year;
      const matchesType =
        type === 'All' ||
        (c.jobRequisitionId &&
         c.jobRequisitionId.type === type &&
         (type !== 'Blue Collar' || c.jobRequisitionId.subType === subType));

      if (!matchesYear || !matchesType) return false;
      if (view === 'quarter' && quarter) return applicationQuarter === +quarter;
      if (view === 'month' && month !== null) return applicationMonth === +month;

      return true;
    });

    const initialArray = () =>
      view === 'year' ? [0] : view === 'quarter' ? Array(4).fill(0) : Array(12).fill(0);

    const pipelineStages = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const pipeline = {};
    for (const stage of pipelineStages) pipeline[stage] = initialArray();

    for (const c of filtered) {
      for (const stage of pipelineStages) {
        const d = c.progressDates?.[stage];
        if (d) {
          const m = dayjs(d).month();
          const idx = getIndex(view, m);
          pipeline[stage][idx]++;
        }
      }
    }

    const sourceCounts = {};
    const sourceApplications = initialArray();
    for (const s of sources) sourceCounts[s] = initialArray();

    for (const c of filtered) {
      const m = dayjs(c.progressDates?.Application).month();
      const idx = getIndex(view, m);
      const rawSource = c.applicationSource?.trim();
      if (rawSource) {
        for (const definedSource of sources) {
          if (rawSource.toLowerCase().includes(definedSource.toLowerCase())) {
            sourceCounts[definedSource][idx]++;
            sourceApplications[idx]++;
            break;
          }
        }
      }
    }

    const sourcePercent = {};
    for (const s of sources) {
      sourcePercent[s] = sourceCounts[s].map((count, i) => {
        const total = sourceApplications[i] || 1;
        return `${Math.round((count / total) * 100)}%`;
      });
    }

    const stats = {
      averageDaysToHire: initialArray(),
      activeVacant: initialArray(),
      fillRate: initialArray()
    };

    const hireDates = {};
    for (const c of filtered) {
      const applied = c.progressDates?.Application;
      const onboard = c.progressDates?.Onboard;
      if (applied && onboard) {
        const m = dayjs(onboard).month();
        const idx = getIndex(view, m);
        hireDates[idx] = hireDates[idx] || [];
        const days = dayjs(onboard).diff(dayjs(applied), 'day');
        hireDates[idx].push(days);
      }
    }

    for (let i = 0; i < stats.averageDaysToHire.length; i++) {
      const daysArr = hireDates[i] || [];
      if (daysArr.length) {
        stats.averageDaysToHire[i] = (daysArr.reduce((a, b) => a + b, 0) / daysArr.length).toFixed(2);
      }

      if (view === 'year') {
        const totalTarget = months.reduce((sum, m) => sum + (roadmapMap[m]?.hiringTargetHC || 0), 0);
        const totalActual = months.reduce((sum, m) => sum + (roadmapMap[m]?.actualHC || 0), 0);
        const totalRoadmap = months.reduce((sum, m) => sum + (roadmapMap[m]?.roadmapHC || 0), 0);
        stats.activeVacant[i] = totalRoadmap - totalActual;
        stats.fillRate[i] = totalTarget > 0 ? `${Math.round((pipeline.Hired[i] / totalTarget) * 100)}%` : '0%';
      } else if (view === 'quarter') {
        const qMonths = getQuarterMonths(i);
        const roadmapSum = qMonths.reduce((sum, m) => sum + (roadmapMap[getMonthName(m)]?.roadmapHC || 0), 0);
        const actualSum = qMonths.reduce((sum, m) => sum + (roadmapMap[getMonthName(m)]?.actualHC || 0), 0);
        const targetSum = qMonths.reduce((sum, m) => sum + (roadmapMap[getMonthName(m)]?.hiringTargetHC || 0), 0);
        stats.activeVacant[i] = roadmapSum - actualSum;
        stats.fillRate[i] = targetSum > 0 ? `${Math.round((pipeline.Hired[i] / targetSum) * 100)}%` : '0%';
      } else {
        const monthName = months[i];
        stats.activeVacant[i] = roadmapMap[monthName]?.roadmapHC - roadmapMap[monthName]?.actualHC;
        const target = roadmapMap[monthName]?.hiringTargetHC;
        stats.fillRate[i] = target > 0 ? `${Math.round((pipeline.Hired[i] / target) * 100)}%` : '0%';
      }
    }

    const rows = [
      { label: '0. Job Requisition', values: [], isHeader: true },
      { label: 'Roadmap HC from planning', values: getCombinedRoadmap('roadmapHC', view, months, roadmapMap) },
      { label: 'Actual HC (end of month)', values: getCombinedRoadmap('actualHC', view, months, roadmapMap) },
      { label: 'Hiring Target HC', values: getCombinedRoadmap('hiringTargetHC', view, months, roadmapMap) },

      { label: '1. Recruitment Pipeline', values: [], isHeader: true },
      { label: '1.1 Received Application', values: pipeline.Application },
      { label: '1.2 Sent to Manager', values: pipeline.ManagerReview },
      { label: '1.3 Interviews', values: pipeline.Interview },
      { label: '1.4 Job Offer', values: pipeline.JobOffer },
      { label: '1.5 Hired', values: pipeline.Hired },
      { label: '1.6 Onboard', values: pipeline.Onboard },

      { label: '2. Source of Application', values: [], isHeader: true },
      ...sources.map(source => ({
        label: source,
        values: sourceCounts[source],
        percents: sourcePercent[source],
        isSource: true
      })),

      { label: '3. Vacancies Statistic', values: [], isHeader: true },
      { label: '3.1 Average Day to Hire (Days)', values: stats.averageDaysToHire },
      { label: '3.2 Active Vacant (Position)', values: stats.activeVacant },
      { label: '3.3 Fill Rate (%)', values: stats.fillRate }
    ];

    res.json({ columns, rows });
  } catch (err) {
    console.error('❌ Report Error:', err);
    res.status(500).json({ message: 'Failed to load report', error: err.message });
  }
};

// 🔧 Helpers
function getIndex(view, month) {
  if (view === 'year') return 0;
  if (view === 'quarter') return Math.floor(month / 3);
  return month;
}

function getQuarterMonths(qIndex) {
  return [qIndex * 3, qIndex * 3 + 1, qIndex * 3 + 2];
}

function getCombinedRoadmap(key, view, months, roadmapMap) {
  if (view === 'year') {
    return [months.reduce((sum, m) => sum + (roadmapMap[m]?.[key] || 0), 0)];
  } else if (view === 'quarter') {
    return [0, 1, 2, 3].map(q =>
      getQuarterMonths(q).reduce((sum, m) => sum + (roadmapMap[getMonthName(m)]?.[key] || 0), 0)
    );
  } else {
    return months.map(m => roadmapMap[m]?.[key] || 0);
  }
}
