
//backend/controllers/ta/jobRequisitionController.js
const JobRequisition = require('../../models/ta/JobRequisition');
const Department = require('../../models/ta/Department');
const Counter = require('../../models/ta/Counter');
const Candidate = require('../../models/ta/Candidate');
const { logActivity } = require('../../utils/logActivity');

// 📦 Fetch all job titles with department info
exports.getAllJobTitles = async (req, res) => {
  try {
    const company = req.company; // ✅ set by authorizeCompanyAccess

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
            subType: dept.subType || (dept.type === 'Blue Collar' ? 'Non-Sewer' : null)
          });
        });
      }
    });

    res.status(200).json({ jobTitles: jobTitleList });
  } catch (err) {
    console.error('❌ Failed to fetch job titles:', err);
    res.status(500).json({ message: 'Error fetching job titles', error: err.message });
  }
};

// ➕ Create a job requisition
// ➕ Create a job requisition (always allowed, even if a Vacant one exists)
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
      targetCandidates
    } = req.body;

    // 1️⃣ Validate department
    const dept = await Department.findById(departmentId);
    if (!dept) {
      return res.status(400).json({ message: 'Invalid department ID' });
    }

    const company = req.company.toUpperCase();

    // ── Duplicate‐Vacant check removed ──

    // 2️⃣ Generate the auto‐incremented ID
    const resolvedSubType = type === 'Blue Collar' ? (subType || 'Non-Sewer') : undefined;
    const prefix = type === 'Blue Collar' ? 'BJR' : 'WJR';

    const counter = await Counter.findOneAndUpdate(
      { name: `jobRequisition${prefix}` },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );
    const jobRequisitionId = `${prefix}-${counter.value}`;

    // 3️⃣ Save
    const newRequisition = new JobRequisition({
      jobRequisitionId,
      departmentId,
      departmentName,
      jobTitle,
      recruiter,
      targetCandidates: targetCandidates || 1,
      hiringCost,
      status,
      type,
      subType: resolvedSubType,
      openingDate,
      startDate,
      company
    });
    await newRequisition.save();

    // 4️⃣ Log & emit
    await logActivity({
      actionType: 'CREATE',
      collectionName: 'JobRequisition',
      documentId: newRequisition._id,
      newData: newRequisition,
      performedBy: req.user.email,
      company
    });
    req.app.get('io').emit('jobAdded', newRequisition);

    // 5️⃣ Respond
    res.status(201).json({
      message: 'Job requisition created successfully.',
      requisition: newRequisition
    });
  } catch (err) {
    console.error('❌ Error creating job requisition:', err);
    res.status(500).json({
      message: 'Failed to create job requisition',
      error: err.message
    });
  }
};


// 📝 Update a requisition
exports.updateJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const company = req.company;

    const existing = await JobRequisition.findOne({ _id: id, company });
    if (!existing) {
      return res.status(404).json({ message: 'Requisition not found' });
    }

    // ── 1) If targetCandidates is being changed, validate it ─────────────────
    if (req.body.targetCandidates != null) {
      let newTarget = Number(req.body.targetCandidates);

      if (!Number.isFinite(newTarget) || newTarget < 1) {
        return res.status(400).json({ message: 'Invalid target candidates value' });
      }

      // Count current onboard (already hired & onboarded)
      const onboardCount = await Candidate.countDocuments({
        jobRequisitionId: existing._id,
        progress: 'Onboard',
        _onboardCounted: true,
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
      });

      // ❌ Cannot set target lower than current onboard
      if (newTarget < onboardCount) {
        return res.status(400).json({
          message: `Target cannot be less than current onboard (${onboardCount}).`
        });
      }

      // Make sure we store numeric value
      req.body.targetCandidates = newTarget;
    }

    // ── 2) Update the requisition normally ───────────────────────────────────
    const updated = await JobRequisition.findByIdAndUpdate(id, req.body, { new: true });

    // ── 3) Recompute status (Vacant / Suspended / Filled) based on new target
    //     Skip if the job is Cancel (manual override)
    if (updated.status !== 'Cancel') {
      const [offerCount, onboardCount] = await Promise.all([
        Candidate.countDocuments({
          jobRequisitionId: updated._id,
          progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
          _offerCounted: true,
          hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
        }),
        Candidate.countDocuments({
          jobRequisitionId: updated._id,
          progress: 'Onboard',
          _onboardCounted: true,
          hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
        })
      ]);

      updated.offerCount   = offerCount;
      updated.onboardCount = onboardCount;

      updated.status =
        onboardCount >= updated.targetCandidates ? 'Filled'
        : offerCount >= updated.targetCandidates ? 'Suspended'
        : 'Vacant';

      await updated.save();
    }

    // ── 4) Log & emit ────────────────────────────────────────────────────────
    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'JobRequisition',
      documentId: updated._id,
      previousData: existing,
      newData: updated,
      performedBy: req.user.email,
      company
    });

    const io = req.app.get('io');
    io.emit('jobUpdated', updated);

    res.json({ message: 'Job requisition updated.', requisition: updated });
  } catch (err) {
    console.error('❌ Error updating requisition:', err);
    res.status(500).json({ message: 'Failed to update requisition', error: err.message });
  }
};


exports.deleteJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const company = req.company;

    const job = await JobRequisition.findOne({ _id: id, company });
    if (!job) return res.status(404).json({ message: 'Requisition not found' });

    await logActivity({
      actionType: 'DELETE',
      collectionName: 'JobRequisition',
      documentId: job._id,
      previousData: job,
      performedBy: req.user.email,
      company
    });

    await JobRequisition.findByIdAndDelete(id);

    // ✅ Emit real-time delete event
    const io = req.app.get('io');
    io.emit('jobDeleted', job._id);

    res.json({ message: 'Job requisition deleted successfully.' });
  } catch (err) {
    console.error('❌ Error deleting requisition:', err);
    res.status(500).json({ message: 'Failed to delete requisition', error: err.message });
  }
};

exports.getJobRequisitions = async (req, res) => {
  try {
    const company = req.company;

    // Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    // Extract filters
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
      subType
    } = req.query;

    // Base filter
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
    // DATE RANGE filter for openingDate
    if (openingDate) {
      const d = new Date(openingDate);
      const next = new Date(openingDate);
      next.setDate(next.getDate() + 1);
      filter.openingDate = { $gte: d, $lt: next };
    }
    if (recruiter) {
      filter.recruiter = { $regex: recruiter, $options: 'i' };
    }
    if (status) {
      filter.status = status;
    }
    // DATE RANGE filter for startDate
    if (startDate) {
      const d2 = new Date(startDate);
      const next2 = new Date(startDate);
      next2.setDate(next2.getDate() + 1);
      filter.startDate = { $gte: d2, $lt: next2 };
    }
    if (hiringCost) {
      filter.hiringCost = Number(hiringCost);
    }
    if (type) {
      filter.type = type;
    }
    if (subType) {
      filter.subType = subType;
    }

    // Total count for pagination
    const total = await JobRequisition.countDocuments(filter);

    // Fetch paginated
    const jobList = await JobRequisition.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const jobIds = jobList.map(j => j._id);

    // Count candidates per requisition
    const counts = await Candidate.aggregate([
      {
        $match: {
          jobRequisitionId: { $in: jobIds },
          hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
        }
      },
      {
        $group: {
          _id: {
            jobRequisitionId: '$jobRequisitionId',
            progress: '$progress'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Map counts
    const countMap = {};
    counts.forEach(({ _id, count }) => {
      const jid = _id.jobRequisitionId.toString();
      if (!countMap[jid]) countMap[jid] = { offerCount: 0, onboardCount: 0 };
      if (_id.progress === 'Onboard') {
        countMap[jid].onboardCount += count;
        countMap[jid].offerCount   += count;
      } else if (_id.progress === 'Hired' || _id.progress === 'JobOffer') {
        countMap[jid].offerCount   += count;
      }
    });

    // Append to each job
    const jobsWithCounts = jobList.map(job => {
      const jid = job._id.toString();
      return {
        ...job,
        offerCount:   countMap[jid]?.offerCount   || 0,
        onboardCount: countMap[jid]?.onboardCount || 0
      };
    });

    // Return
    res.json({ requisitions: jobsWithCounts, total });
  } catch (err) {
    console.error('❌ Error fetching job requisitions:', err);
    res.status(500).json({
      message: 'Error fetching requisitions',
      error: err.message
    });
  }
};


// 🟢 GET /ta/job-requisitions/vacant
exports.getVacantRequisitions = async (req, res) => {
  try {
    const company = req.company;

    const { type, subType } = req.query;

    const query = {
      company: company.toUpperCase(),
      status: 'Vacant'
    };

    if (type) query.type = type;
    if (subType) query.subType = subType;

    const vacant = await JobRequisition.find(query).sort({ createdAt: -1 });


    res.json(vacant);
  } catch (err) {
    console.error('❌ Error fetching vacant requisitions:', err);
    res.status(500).json({ message: 'Failed to fetch vacant requisitions', error: err.message });
  }
};

