// backend/controllers/ta/jobRequisitionController.js

const JobRequisition = require('../../models/ta/JobRequisition');
const Department = require('../../models/ta/Department');
const Counter = require('../../models/ta/Counter');
const Candidate = require('../../models/ta/Candidate');
const { logActivity } = require('../../utils/logActivity');

const {
  syncWhiteCollarRoadmapForRequisitionChange,
} = require('../../utils/ta/roadmapSync');

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toBoolean(value) {
  return ['1', 'true', 'yes'].includes(String(value || '').trim().toLowerCase());
}

function buildJobRequisitionFilter(query = {}, company) {
  const {
    jobId,
    department,
    jobTitle,
    openingDate,
    recruiter,
    status,
    startDate,
    hiringCost,
    type,
    subType,
  } = query;

  const filter = { company: company.toUpperCase() };

  if (jobId) {
    filter.jobRequisitionId = { $regex: jobId, $options: 'i' };
  }

  if (department) {
    filter.departmentName = { $regex: department, $options: 'i' };
  }

  if (jobTitle) {
    filter.jobTitle = { $regex: jobTitle, $options: 'i' };
  }

  if (openingDate) {
    const start = new Date(openingDate);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(openingDate);
      end.setDate(end.getDate() + 1);
      filter.openingDate = { $gte: start, $lt: end };
    }
  }

  if (recruiter) {
    filter.recruiter = { $regex: recruiter, $options: 'i' };
  }

  if (status) {
    filter.status = status;
  }

  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(startDate);
      end.setDate(end.getDate() + 1);
      filter.startDate = { $gte: start, $lt: end };
    }
  }

  if (hiringCost !== undefined && hiringCost !== null && String(hiringCost).trim() !== '') {
    const numericHiringCost = Number(hiringCost);
    if (!Number.isNaN(numericHiringCost)) {
      filter.hiringCost = numericHiringCost;
    }
  }

  if (type) {
    filter.type = type;
  }

  if (subType) {
    filter.subType = subType;
  }

  return filter;
}

async function enrichJobRequisitions(jobList = []) {
  if (!Array.isArray(jobList) || !jobList.length) {
    return [];
  }

  const jobIds = jobList.map((job) => job._id);

  const counts = await Candidate.aggregate([
    {
      $match: {
        jobRequisitionId: { $in: jobIds },
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
      },
    },
    {
      $group: {
        _id: {
          jobRequisitionId: '$jobRequisitionId',
          progress: '$progress',
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = {};

  counts.forEach(({ _id, count }) => {
    const jobId = _id.jobRequisitionId.toString();

    if (!countMap[jobId]) {
      countMap[jobId] = {
        offerCount: 0,
        onboardCount: 0,
      };
    }

    if (_id.progress === 'Onboard') {
      countMap[jobId].onboardCount += count;
      countMap[jobId].offerCount += count;
    } else if (_id.progress === 'Hired' || _id.progress === 'JobOffer') {
      countMap[jobId].offerCount += count;
    }
  });

  return jobList.map((job) => {
    const jobId = job._id.toString();
    const offerCount = countMap[jobId]?.offerCount || 0;
    const onboardCount = countMap[jobId]?.onboardCount || 0;

    let liveDaysToFill = job.daysToFill ?? null;

    if (!job.latestOnboardDate && job.openingDate) {
      const start = new Date(job.openingDate);

      if (!Number.isNaN(start.getTime())) {
        const msPerDay = 1000 * 60 * 60 * 24;
        liveDaysToFill = Math.max(0, Math.ceil((new Date() - start) / msPerDay));
      }
    }

    return {
      ...job,
      offerCount,
      onboardCount,
      daysToFill: liveDaysToFill,
    };
  });
}

// 📦 Fetch all job titles with department info
exports.getAllJobTitles = async (req, res) => {
  try {
    const company = req.company;

    const departments = await Department.find(
      { company: company.toUpperCase() },
      'name jobTitles type subType company'
    );

    const jobTitleList = [];

    departments.forEach((dept) => {
      if (Array.isArray(dept.jobTitles)) {
        dept.jobTitles.forEach((title) => {
          jobTitleList.push({
            jobTitle: title,
            departmentId: dept._id,
            departmentName: dept.name,
            company: dept.company,
            type: dept.type,
            subType: dept.subType || (dept.type === 'Blue Collar' ? 'Non-Sewer' : null),
          });
        });
      }
    });

    res.status(200).json({
      jobTitles: jobTitleList,
    });
  } catch (err) {
    console.error('❌ Failed to fetch job titles:', err);

    res.status(500).json({
      message: 'Error fetching job titles',
      error: err.message,
    });
  }
};

// ➕ Create a job requisition
exports.createJobRequisition = async (req, res) => {
  try {
    const {
      departmentId,
      departmentName,
      jobTitle,
      recruiter,
      hiringCost,
      status,
      openingDate,
      startDate,
      type,
      subType,
      targetCandidates,
    } = req.body;

    const dept = await Department.findById(departmentId);

    if (!dept) {
      return res.status(400).json({
        message: 'Invalid department ID',
      });
    }

    const company = req.company.toUpperCase();
    const resolvedTargetCandidates = Math.max(1, Number(targetCandidates || 1));
    const resolvedSubType = type === 'Blue Collar' ? subType || 'Non-Sewer' : undefined;
    const prefix = type === 'Blue Collar' ? 'BJR' : 'WJR';

    const counter = await Counter.findOneAndUpdate(
      { name: `jobRequisition${prefix}` },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    const jobRequisitionId = `${prefix}-${counter.value}`;

    const newRequisition = new JobRequisition({
      jobRequisitionId,
      departmentId,
      departmentName,
      jobTitle,
      recruiter,
      targetCandidates: resolvedTargetCandidates,
      hiringCost,
      status: status || 'Vacant',
      type,
      subType: resolvedSubType,
      openingDate,
      startDate,
      company,
    });

    await newRequisition.save();

    // ✅ Auto White Collar Roadmap increase
    await syncWhiteCollarRoadmapForRequisitionChange({
      company,
      before: null,
      after: newRequisition.toObject(),
    });

    await logActivity({
      actionType: 'CREATE',
      collectionName: 'JobRequisition',
      documentId: newRequisition._id,
      newData: newRequisition,
      performedBy: req.user.email,
      company,
    });

    req.app.get('io').emit('jobAdded', newRequisition);

    res.status(201).json({
      message: 'Job requisition created successfully.',
      requisition: newRequisition,
    });
  } catch (err) {
    console.error('❌ Error creating job requisition:', err);

    res.status(500).json({
      message: 'Failed to create job requisition',
      error: err.message,
    });
  }
};

// 📝 Update a requisition
exports.updateJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const company = req.company.toUpperCase();

    const existing = await JobRequisition.findOne({ _id: id, company });

    if (!existing) {
      return res.status(404).json({
        message: 'Requisition not found',
      });
    }

    // ✅ Old state for roadmap difference calculation
    const roadmapBefore = existing.toObject();

    if (req.body.targetCandidates != null) {
      const newTarget = Number(req.body.targetCandidates);

      if (!Number.isFinite(newTarget) || newTarget < 1) {
        return res.status(400).json({
          message: 'Invalid target candidates value',
        });
      }

      const onboardCount = await Candidate.countDocuments({
        jobRequisitionId: existing._id,
        progress: 'Onboard',
        _onboardCounted: true,
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
      });

      if (newTarget < onboardCount) {
        return res.status(400).json({
          message: `Target cannot be less than current onboard (${onboardCount}).`,
        });
      }

      req.body.targetCandidates = newTarget;
    }

    const updated = await JobRequisition.findOneAndUpdate(
      { _id: id, company },
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: 'Requisition not found after update',
      });
    }

    if (updated.status !== 'Cancel') {
      const [offerCount, onboardCount] = await Promise.all([
        Candidate.countDocuments({
          jobRequisitionId: updated._id,
          progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
          _offerCounted: true,
          hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
        }),
        Candidate.countDocuments({
          jobRequisitionId: updated._id,
          progress: 'Onboard',
          _onboardCounted: true,
          hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
        }),
      ]);

      updated.offerCount = offerCount;
      updated.onboardCount = onboardCount;

      updated.status =
        onboardCount >= updated.targetCandidates
          ? 'Filled'
          : offerCount >= updated.targetCandidates
            ? 'Suspended'
            : 'Vacant';

      await updated.save();
    }

    // ✅ Auto White Collar Roadmap sync for target/date/type/status changes
    await syncWhiteCollarRoadmapForRequisitionChange({
      company,
      before: roadmapBefore,
      after: updated.toObject(),
    });

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'JobRequisition',
      documentId: updated._id,
      previousData: existing,
      newData: updated,
      performedBy: req.user.email,
      company,
    });

    req.app.get('io').emit('jobUpdated', updated);

    res.json({
      message: 'Job requisition updated.',
      requisition: updated,
    });
  } catch (err) {
    console.error('❌ Error updating requisition:', err);

    res.status(500).json({
      message: 'Failed to update requisition',
      error: err.message,
    });
  }
};

// 🔴 Delete a requisition
exports.deleteJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const company = req.company.toUpperCase();

    const job = await JobRequisition.findOne({ _id: id, company });

    if (!job) {
      return res.status(404).json({
        message: 'Requisition not found',
      });
    }

    const roadmapBefore = job.toObject();

    await logActivity({
      actionType: 'DELETE',
      collectionName: 'JobRequisition',
      documentId: job._id,
      previousData: job,
      performedBy: req.user.email,
      company,
    });

    await JobRequisition.findByIdAndDelete(id);

    // ✅ Auto White Collar Roadmap decrease
    await syncWhiteCollarRoadmapForRequisitionChange({
      company,
      before: roadmapBefore,
      after: null,
    });

    req.app.get('io').emit('jobDeleted', job._id);

    res.json({
      message: 'Job requisition deleted successfully.',
    });
  } catch (err) {
    console.error('❌ Error deleting requisition:', err);

    res.status(500).json({
      message: 'Failed to delete requisition',
      error: err.message,
    });
  }
};

// 📋 Get requisitions with backend pagination + exportAll
exports.getJobRequisitions = async (req, res) => {
  try {
    const company = req.company.toUpperCase();
    const exportAll = toBoolean(req.query.exportAll);

    const page = exportAll ? 1 : parsePositiveInt(req.query.page, 1);
    const limit = exportAll ? null : Math.min(parsePositiveInt(req.query.limit, 10), 50);
    const skip = exportAll ? 0 : (page - 1) * limit;

    const filter = buildJobRequisitionFilter(req.query, company);
    const total = await JobRequisition.countDocuments(filter);

    let query = JobRequisition.find(filter).sort({
      createdAt: -1,
      _id: -1,
    });

    if (!exportAll) {
      query = query.skip(skip).limit(limit);
    }

    const jobList = await query.lean();
    const requisitions = await enrichJobRequisitions(jobList);

    const loadedCount = exportAll ? requisitions.length : skip + requisitions.length;
    const hasMore = exportAll ? false : loadedCount < total;

    res.json({
      requisitions,
      total,
      page,
      limit: exportAll ? requisitions.length : limit,
      hasMore,
      loadedCount,
    });
  } catch (err) {
    console.error('❌ Error fetching job requisitions:', err);

    res.status(500).json({
      message: 'Error fetching requisitions',
      error: err.message,
    });
  }
};

// 🟢 GET /ta/job-requisitions/vacant
exports.getVacantRequisitions = async (req, res) => {
  try {
    const company = req.company.toUpperCase();
    const { type, subType } = req.query;

    const query = {
      company,
      status: 'Vacant',
    };

    if (type) query.type = type;
    if (subType) query.subType = subType;

    const vacant = await JobRequisition.find(query).sort({
      createdAt: -1,
    });

    res.json(vacant);
  } catch (err) {
    console.error('❌ Error fetching vacant requisitions:', err);

    res.status(500).json({
      message: 'Failed to fetch vacant requisitions',
      error: err.message,
    });
  }
};