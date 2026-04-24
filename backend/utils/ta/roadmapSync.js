// backend/utils/ta/roadmapSync.js

const Roadmap = require('../../models/ta/Roadmap');
const Candidate = require('../../models/ta/Candidate');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function normalizeCompany(company) {
  return String(company || '').trim().toUpperCase();
}

function toPositiveNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function getMonthLabel(dateInput) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return MONTHS[date.getMonth()];
}

function getYearValue(dateInput) {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getFullYear();
}

function getMonthRange(year, month) {
  const monthIndex = MONTHS.indexOf(month);

  if (monthIndex < 0) {
    return null;
  }

  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);

  return { start, end };
}

async function clampRoadmapHC(roadmapId) {
  const roadmap = await Roadmap.findById(roadmapId);
  if (!roadmap) return null;

  let changed = false;

  if (roadmap.roadmapHC < 0) {
    roadmap.roadmapHC = 0;
    changed = true;
  }

  if (roadmap.hiringTargetHC < 0) {
    roadmap.hiringTargetHC = 0;
    changed = true;
  }

  if (roadmap.actualHC < 0) {
    roadmap.actualHC = 0;
    changed = true;
  }

  if (changed) {
    await roadmap.save();
  }

  return roadmap;
}

/**
 * White Collar only.
 * targetDelta positive = add HC.
 * targetDelta negative = remove HC.
 */
async function adjustWhiteCollarRoadmapByDelta({
  company,
  openingDate,
  targetDelta,
  source = 'JOB_REQUISITION',
}) {
  const normalizedCompany = normalizeCompany(company);
  const delta = Number(targetDelta || 0);

  if (!normalizedCompany || !openingDate || !delta) {
    return null;
  }

  const year = getYearValue(openingDate);
  const month = getMonthLabel(openingDate);

  if (!year || !month) {
    return null;
  }

  const roadmap = await Roadmap.findOneAndUpdate(
    {
      company: normalizedCompany,
      year,
      month,
      type: 'White Collar',
      subType: null,
    },
    {
      $setOnInsert: {
        company: normalizedCompany,
        year,
        month,
        type: 'White Collar',
        subType: null,
        actualHC: 0,
        generatedFrom: source,
      },
      $inc: {
        roadmapHC: delta,
        hiringTargetHC: delta,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return clampRoadmapHC(roadmap._id);
}

/**
 * Use this when a requisition changes target/openingDate/type/status.
 * It removes old active target and adds new active target.
 */
async function syncWhiteCollarRoadmapForRequisitionChange({
  company,
  before,
  after,
}) {
  const normalizedCompany = normalizeCompany(company);

  if (!normalizedCompany) {
    return;
  }

  const beforeIsWhite = before?.type === 'White Collar';
  const afterIsWhite = after?.type === 'White Collar';

  const beforeIsActive = before && before.status !== 'Cancel';
  const afterIsActive = after && after.status !== 'Cancel';

  const beforeTarget = beforeIsWhite && beforeIsActive
    ? toPositiveNumber(before.targetCandidates)
    : 0;

  const afterTarget = afterIsWhite && afterIsActive
    ? toPositiveNumber(after.targetCandidates)
    : 0;

  if (beforeTarget > 0) {
    await adjustWhiteCollarRoadmapByDelta({
      company: normalizedCompany,
      openingDate: before.openingDate,
      targetDelta: -beforeTarget,
    });
  }

  if (afterTarget > 0) {
    await adjustWhiteCollarRoadmapByDelta({
      company: normalizedCompany,
      openingDate: after.openingDate,
      targetDelta: afterTarget,
    });
  }
}

/**
 * Recalculate actualHC for one White Collar month from onboard candidates.
 * Safer than += 1 because it avoids double counting.
 */
async function recomputeWhiteCollarActualHCForMonth({
  company,
  year,
  month,
}) {
  const normalizedCompany = normalizeCompany(company);

  if (!normalizedCompany || !year || !month) {
    return null;
  }

  const range = getMonthRange(year, month);
  if (!range) return null;

  const actualHC = await Candidate.countDocuments({
    company: normalizedCompany,
    type: 'White Collar',
    progress: 'Onboard',
    _onboardCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
    'progressDates.Onboard': {
      $gte: range.start,
      $lt: range.end,
    },
  });

  return Roadmap.findOneAndUpdate(
    {
      company: normalizedCompany,
      year,
      month,
      type: 'White Collar',
      subType: null,
    },
    {
      $setOnInsert: {
        company: normalizedCompany,
        year,
        month,
        type: 'White Collar',
        subType: null,
        roadmapHC: 0,
        hiringTargetHC: 0,
        generatedFrom: 'SYSTEM',
      },
      $set: {
        actualHC,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function recomputeWhiteCollarActualHCByDate({
  company,
  date,
}) {
  const normalizedCompany = normalizeCompany(company);
  const year = getYearValue(date);
  const month = getMonthLabel(date);

  if (!normalizedCompany || !year || !month) {
    return null;
  }

  return recomputeWhiteCollarActualHCForMonth({
    company: normalizedCompany,
    year,
    month,
  });
}

module.exports = {
  MONTHS,
  adjustWhiteCollarRoadmapByDelta,
  syncWhiteCollarRoadmapForRequisitionChange,
  recomputeWhiteCollarActualHCForMonth,
  recomputeWhiteCollarActualHCByDate,
};