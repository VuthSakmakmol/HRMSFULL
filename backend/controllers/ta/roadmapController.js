// backend/controllers/ta/roadmapController.js

const Roadmap = require('../../models/ta/Roadmap');
const JobRequisition = require('../../models/ta/JobRequisition');
const Candidate = require('../../models/ta/Candidate');

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
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

function getMonthIndex(month) {
  const raw = normalizeText(month);

  return MONTHS.findIndex(
    (m) => m.toLowerCase() === raw.toLowerCase()
  );
}

function getMonthDateRange(year, month) {
  const monthIndex = getMonthIndex(month);

  if (!year || monthIndex < 0) {
    return null;
  }

  const y = Number(year);

  return {
    start: new Date(y, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(y, monthIndex + 1, 1, 0, 0, 0, 0),
  };
}

function getYearDateRange(year) {
  if (!year) return null;

  const y = Number(year);

  return {
    start: new Date(y, 0, 1, 0, 0, 0, 0),
    end: new Date(y + 1, 0, 1, 0, 0, 0, 0),
  };
}

function getMonthFromDate(dateValue) {
  const d = new Date(dateValue);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return MONTHS[d.getMonth()];
}

function getYearFromDate(dateValue) {
  const d = new Date(dateValue);

  if (Number.isNaN(d.getTime())) {
    return null;
  }

  return d.getFullYear();
}

function buildRoadmapQuery(req) {
  const company = normalizeCompany(req.company || req.query.company);

  if (!company) {
    const err = new Error('Missing company');
    err.status = 400;
    throw err;
  }

  const query = { company };

  if (req.query.year) {
    query.year = Number(req.query.year);
  }

  if (req.query.month) {
    query.month = normalizeText(req.query.month);
  }

  if (req.query.type) {
    query.type = normalizeText(req.query.type);
  }

  if (req.query.subType) {
    query.subType = normalizeText(req.query.subType);
  }

  return query;
}

function buildRequisitionMatchForRoadmap({ company, year, month, type, subType }) {
  const match = {
    company,
    status: { $ne: 'Cancel' },
  };

  if (type) {
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

  const monthRange = getMonthDateRange(year, month);

  if (monthRange) {
    match.openingDate = {
      $gte: monthRange.start,
      $lt: monthRange.end,
    };
  } else if (year) {
    const yearRange = getYearDateRange(year);

    match.openingDate = {
      $gte: yearRange.start,
      $lt: yearRange.end,
    };
  }

  return match;
}

async function getRequisitionsForRoadmap({ company, year, month, type, subType }) {
  const match = buildRequisitionMatchForRoadmap({
    company,
    year,
    month,
    type,
    subType,
  });

  return JobRequisition.find(match).select('_id targetCandidates openingDate type subType');
}

/**
 * ✅ Actual HC rule:
 * Count only candidates who are actually onboarded under the same requisitions.
 *
 * Do NOT count by candidate updatedAt.
 * Do NOT count all candidates in the same month.
 * Do NOT count progress = Hired as Actual HC.
 */
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

async function enrichRoadmap(row) {
  const plain = typeof row.toObject === 'function' ? row.toObject() : row;

  const company = normalizeCompany(plain.company);
  const year = Number(plain.year);
  const month = normalizeText(plain.month);
  const type = normalizeText(plain.type);
  const subType = type === 'Blue Collar'
    ? normalizeText(plain.subType || 'Non-Sewer')
    : null;

  const requisitions = await getRequisitionsForRoadmap({
    company,
    year,
    month,
    type,
    subType,
  });

  const requisitionIds = requisitions.map((req) => req._id);

  const requestedHC = sumTargetCandidates(requisitions);

  const actualHC = await countActualHCFromRequisitions({
    company,
    requisitionIds,
  });

  /**
   * White Collar:
   * Roadmap HC is auto generated from requisition targetCandidates.
   *
   * Blue Collar:
   * Roadmap HC is manual plan from roadmap table.
   */
  const roadmapHC =
    type === 'White Collar'
      ? requestedHC
      : normalizeNumber(plain.roadmapHC);

  const hiringTargetHC = Math.max(0, roadmapHC - actualHC);

  /**
   * White Collar:
   * Remaining HC means not yet onboarded from that requisition target.
   *
   * Blue Collar:
   * Remaining Hiring HC = Roadmap HC - Actual HC - requested HC.
   */
  const remainingHiringHC =
    type === 'White Collar'
      ? hiringTargetHC
      : Math.max(0, hiringTargetHC - requestedHC);

  return {
    ...plain,
    roadmapHC,
    actualHC,
    hiringTargetHC,
    requestedHC,
    remainingHiringHC,
  };
}

async function buildWhiteCollarVirtualRoadmaps(query) {
  const company = query.company;

  const match = {
    company,
    type: 'White Collar',
    status: { $ne: 'Cancel' },
  };

  if (query.year && query.month) {
    const monthRange = getMonthDateRange(query.year, query.month);

    if (monthRange) {
      match.openingDate = {
        $gte: monthRange.start,
        $lt: monthRange.end,
      };
    }
  } else if (query.year) {
    const yearRange = getYearDateRange(query.year);

    match.openingDate = {
      $gte: yearRange.start,
      $lt: yearRange.end,
    };
  }

  const requisitions = await JobRequisition.find(match).select(
    'company type subType openingDate targetCandidates'
  );

  const grouped = new Map();

  for (const req of requisitions) {
    const year = getYearFromDate(req.openingDate);
    const month = getMonthFromDate(req.openingDate);

    if (!year || !month) continue;

    if (query.month && month.toLowerCase() !== query.month.toLowerCase()) {
      continue;
    }

    const key = `${company}_${year}_${month}_White Collar`;

    const old = grouped.get(key) || {
      _id: `AUTO_WHITE_${company}_${year}_${month}`,
      company,
      year,
      month,
      type: 'White Collar',
      subType: null,
      roadmapHC: 0,
      generatedFrom: 'JOB_REQUISITION',
      isVirtual: true,
      createdAt: null,
      updatedAt: null,
    };

    old.roadmapHC += normalizeNumber(req.targetCandidates);

    grouped.set(key, old);
  }

  return Array.from(grouped.values());
}

function sortRoadmapRows(a, b) {
  const yearA = Number(a.year || 0);
  const yearB = Number(b.year || 0);

  if (yearA !== yearB) return yearA - yearB;

  const monthA = getMonthIndex(a.month);
  const monthB = getMonthIndex(b.month);

  if (monthA !== monthB) return monthA - monthB;

  const typeA = String(a.type || '');
  const typeB = String(b.type || '');

  if (typeA !== typeB) {
    return typeA.localeCompare(typeB);
  }

  const subA = String(a.subType || '');
  const subB = String(b.subType || '');

  return subA.localeCompare(subB);
}

async function getManualBlueRoadmaps(query) {
  if (query.type && query.type !== 'Blue Collar') {
    return [];
  }

  const manualQuery = {
    ...query,
    type: 'Blue Collar',
  };

  return Roadmap.find(manualQuery).sort({
    year: 1,
    month: 1,
    type: 1,
    subType: 1,
  });
}

async function getVirtualWhiteRoadmaps(query) {
  if (query.type && query.type !== 'White Collar') {
    return [];
  }

  // White Collar has no subType.
  if (query.subType) {
    return [];
  }

  return buildWhiteCollarVirtualRoadmaps(query);
}

// ─────────────────────────────────────────────
// GET /roadmaps
// Blue Collar = manual Roadmap HC
// White Collar = auto generated from requisitions
// Actual HC = onboarded candidates from same requisitions only
// ─────────────────────────────────────────────
exports.getRoadmaps = async (req, res) => {
  try {
    const query = buildRoadmapQuery(req);

    const [manualBlueRows, virtualWhiteRows] = await Promise.all([
      getManualBlueRoadmaps(query),
      getVirtualWhiteRoadmaps(query),
    ]);

    const combinedRows = [
      ...manualBlueRows,
      ...virtualWhiteRows,
    ];

    const enriched = await Promise.all(combinedRows.map(enrichRoadmap));

    enriched.sort(sortRoadmapRows);

    res.json(enriched);
  } catch (err) {
    console.error('❌ Error fetching roadmaps:', err);

    res.status(err.status || 500).json({
      message: err.message || 'Error fetching roadmaps',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /roadmaps
// Only Blue Collar can be manually created
// Actual HC and Hiring Target HC are auto calculated
// ─────────────────────────────────────────────
exports.createRoadmap = async (req, res) => {
  try {
    const company = normalizeCompany(req.company || req.body.company);

    if (!company) {
      return res.status(400).json({
        message: 'Missing company in request',
      });
    }

    const year = Number(req.body.year);
    const month = normalizeText(req.body.month);
    const type = normalizeText(req.body.type);
    const subType =
      type === 'Blue Collar'
        ? normalizeText(req.body.subType || 'Non-Sewer')
        : null;

    if (!year || !month || !type) {
      return res.status(400).json({
        message: 'Year, month, and type are required.',
      });
    }

    if (type === 'White Collar') {
      return res.status(400).json({
        message:
          'White Collar roadmap is auto generated from Job Requisition. Please create a White Collar requisition instead.',
      });
    }

    const exists = await Roadmap.findOne({
      company,
      year,
      month,
      type,
      subType,
    });

    if (exists) {
      return res.status(400).json({
        message: `Roadmap already exists for ${month} ${year} (${type}${
          subType ? ' - ' + subType : ''
        })`,
      });
    }

    const newRoadmap = new Roadmap({
      year,
      month,
      type,
      subType,
      roadmapHC: normalizeNumber(req.body.roadmapHC),
      company,
      generatedFrom: 'MANUAL',
    });

    await newRoadmap.save();

    const enriched = await enrichRoadmap(newRoadmap);

    res.status(201).json(enriched);
  } catch (err) {
    console.error('❌ Roadmap creation error:', err);

    res.status(400).json({
      message: 'Creation failed',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────
// PUT /roadmaps/:id
// Only MANUAL Blue Collar rows can be edited
// Actual HC and Hiring Target HC are auto calculated
// ─────────────────────────────────────────────
exports.updateRoadmap = async (req, res) => {
  try {
    const company = normalizeCompany(req.company || req.body.company);

    if (!company) {
      return res.status(400).json({
        message: 'Missing company in request',
      });
    }

    const existing = await Roadmap.findOne({
      _id: req.params.id,
      company,
    });

    if (!existing) {
      return res.status(404).json({
        message: 'Roadmap not found for this company',
      });
    }

    if (existing.type === 'White Collar' || existing.generatedFrom !== 'MANUAL') {
      return res.status(403).json({
        message: 'This roadmap is system generated and cannot be edited manually.',
      });
    }

    const type = normalizeText(req.body.type || existing.type);
    const subType =
      type === 'Blue Collar'
        ? normalizeText(req.body.subType || existing.subType || 'Non-Sewer')
        : null;

    if (type === 'White Collar') {
      return res.status(400).json({
        message: 'White Collar roadmap is auto generated from Job Requisition.',
      });
    }

    existing.year = req.body.year ? Number(req.body.year) : existing.year;
    existing.month = req.body.month ? normalizeText(req.body.month) : existing.month;
    existing.type = type;
    existing.subType = subType;

    if (req.body.roadmapHC !== undefined) {
      existing.roadmapHC = normalizeNumber(req.body.roadmapHC);
    }

    existing.company = company;

    await existing.save();

    const enriched = await enrichRoadmap(existing);

    res.json(enriched);
  } catch (err) {
    console.error('❌ Roadmap update error:', err);

    res.status(400).json({
      message: 'Update failed',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────
// DELETE /roadmaps/:id
// Only manual Blue Collar rows can be deleted
// ─────────────────────────────────────────────
exports.deleteRoadmap = async (req, res) => {
  try {
    const company = normalizeCompany(req.company || req.query.company);

    if (!company) {
      return res.status(400).json({
        message: 'Missing company in query',
      });
    }

    const existing = await Roadmap.findOne({
      _id: req.params.id,
      company,
    });

    if (!existing) {
      return res.status(404).json({
        message: 'Roadmap not found for this company',
      });
    }

    if (existing.type === 'White Collar' || existing.generatedFrom !== 'MANUAL') {
      return res.status(403).json({
        message: 'This roadmap is system generated and cannot be deleted manually.',
      });
    }

    await existing.deleteOne();

    res.json({
      message: 'Deleted successfully',
    });
  } catch (err) {
    console.error('❌ Roadmap delete error:', err);

    res.status(400).json({
      message: 'Delete failed',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET /roadmaps/summary
// Dashboard summary from calculated values
// ─────────────────────────────────────────────
exports.getSummary = async (req, res) => {
  try {
    const company = normalizeCompany(req.company || req.query.company);

    if (!company) {
      return res.status(400).json({
        message: 'Missing company in query',
      });
    }

    const query = { company };

    if (req.query.year) {
      query.year = Number(req.query.year);
    }

    if (req.query.month) {
      query.month = normalizeText(req.query.month);
    }

    if (req.query.type) {
      query.type = normalizeText(req.query.type);
    }

    if (req.query.subType) {
      query.subType = normalizeText(req.query.subType);
    }

    const [manualBlueRows, virtualWhiteRows] = await Promise.all([
      getManualBlueRoadmaps(query),
      getVirtualWhiteRoadmaps(query),
    ]);

    const rows = [
      ...manualBlueRows,
      ...virtualWhiteRows,
    ];

    const enriched = await Promise.all(rows.map(enrichRoadmap));

    const summaryMap = new Map();

    for (const row of enriched) {
      const key = [
        row.year,
        row.month,
        row.type,
        row.subType || '',
        row.generatedFrom || '',
      ].join('|');

      const old = summaryMap.get(key) || {
        _id: {
          year: row.year,
          month: row.month,
          type: row.type,
          subType: row.subType || null,
          generatedFrom: row.generatedFrom || null,
        },
        roadmapHC: 0,
        actualHC: 0,
        hiringTargetHC: 0,
        requestedHC: 0,
        remainingHiringHC: 0,
      };

      old.roadmapHC += normalizeNumber(row.roadmapHC);
      old.actualHC += normalizeNumber(row.actualHC);
      old.hiringTargetHC += normalizeNumber(row.hiringTargetHC);
      old.requestedHC += normalizeNumber(row.requestedHC);
      old.remainingHiringHC += normalizeNumber(row.remainingHiringHC);

      summaryMap.set(key, old);
    }

    const summary = Array.from(summaryMap.values()).sort((a, b) =>
      sortRoadmapRows(
        {
          year: a._id.year,
          month: a._id.month,
          type: a._id.type,
          subType: a._id.subType,
        },
        {
          year: b._id.year,
          month: b._id.month,
          type: b._id.type,
          subType: b._id.subType,
        }
      )
    );

    res.json(summary);
  } catch (err) {
    console.error('❌ Roadmap summary error:', err);

    res.status(500).json({
      message: 'Summary generation failed',
      error: err.message,
    });
  }
};