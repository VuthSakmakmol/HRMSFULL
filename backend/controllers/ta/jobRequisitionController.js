const JobRequisition = require('../../models/ta/JobRequisition');
const Department = require('../../models/ta/Department');
const Counter = require('../../models/ta/Counter');
const Candidate = require('../../models/ta/Candidate');
const { logActivity } = require('../../utils/logActivity');

// 📦 Fetch all job titles with department info
exports.getAllJobTitles = async (req, res) => {
  try {
    const role = req.user?.role;
    const userCompany = req.user?.company;
    const queryCompany = req.query.company;

    const companyFilter = role === 'GeneralManager' ? queryCompany : userCompany;
    if (!companyFilter) {
      return res.status(400).json({ message: 'Company is required' });
    }

    const departments = await Department.find(
      { company: companyFilter.trim().toUpperCase() },
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

// ➕ Create a single job requisition
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
      subType
    } = req.body;

    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(400).json({ message: 'Invalid department ID' });

    const company = dept.company;
    const resolvedSubType = type === 'Blue Collar' ? (subType || 'Non-Sewer') : undefined;
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
      targetCandidates: req.body.targetCandidates || 1,
      hiringCost,
      status,
      type,
      subType: resolvedSubType,
      openingDate,
      startDate,
      company
    });

    await newRequisition.save();

    await logActivity({
      actionType: 'CREATE',
      collectionName: 'JobRequisition',
      documentId: newRequisition._id,
      newData: newRequisition,
      performedBy: req.user.email,
      company
    });

    res.status(201).json({
      message: 'Job requisition created successfully.',
      requisition: newRequisition
    });
  } catch (err) {
    console.error('❌ Error creating job requisition:', err);
    res.status(500).json({ message: 'Failed to create job requisition', error: err.message });
  }
};

// 📝 Update a requisition
exports.updateJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await JobRequisition.findById(id);
    if (!existing) return res.status(404).json({ message: 'Requisition not found' });

    const userCompany = req.user?.company;
    const isGM = req.user?.role === 'GeneralManager';
    if (!isGM && existing.company !== userCompany) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updated = await JobRequisition.findByIdAndUpdate(id, req.body, { new: true });

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'JobRequisition',
      documentId: updated._id,
      previousData: existing,
      newData: updated,
      performedBy: req.user.email,
      company: existing.company
    });

    res.json({ message: 'Job requisition updated.', requisition: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update requisition', error: err.message });
  }
};

// 🗑️ Delete a requisition
exports.deleteJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await JobRequisition.findById(id);
    if (!job) return res.status(404).json({ message: 'Requisition not found' });

    const userCompany = req.user?.company;
    const isGM = req.user?.role === 'GeneralManager';
    if (!isGM && job.company !== userCompany) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await logActivity({
      actionType: 'DELETE',
      collectionName: 'JobRequisition',
      documentId: job._id,
      previousData: job,
      performedBy: req.user.email,
      company: job.company
    });

    await JobRequisition.findByIdAndDelete(id);
    res.json({ message: 'Job requisition deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete requisition', error: err.message });
  }
};

// 📋 Get job requisitions with pagination + filters
exports.getJobRequisitions = async (req, res) => {
  try {
    const role = req.user?.role;
    const userCompany = req.user?.company;
    const queryCompany = req.query.company;
    const company = role === 'GeneralManager' ? queryCompany : userCompany;

    if (!company) {
      return res.status(400).json({ message: 'Company is required' });
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    // Filters
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

    const filter = { company: company.trim().toUpperCase() };

    if (jobId) filter.jobRequisitionId = { $regex: jobId, $options: 'i' };
    if (department) filter.departmentName = { $regex: department, $options: 'i' };
    if (jobTitle) filter.jobTitle = { $regex: jobTitle, $options: 'i' };
    if (openingDate) filter.openingDate = { $regex: openingDate, $options: 'i' };
    if (recruiter) filter.recruiter = { $regex: recruiter, $options: 'i' };
    if (status) filter.status = status;
    if (startDate) filter.startDate = { $regex: startDate, $options: 'i' };
    if (hiringCost) filter.hiringCost = Number(hiringCost); // optional: support exact number filter
    if (type) filter.type = type;
    if (subType) filter.subType = subType;

    // Total count for pagination
    const total = await JobRequisition.countDocuments(filter);

    const jobList = await JobRequisition.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Count onboard + offer by progress stage
    const jobIds = jobList.map(j => j._id);
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

    const countMap = {};
    counts.forEach(({ _id, count }) => {
      const jobId = _id.jobRequisitionId.toString();
      const progress = _id.progress;

      if (!countMap[jobId]) {
        countMap[jobId] = { offerCount: 0, onboardCount: 0 };
      }

      if (progress === 'Onboard') {
        countMap[jobId].onboardCount += count;
        countMap[jobId].offerCount += count;
      } else if (progress === 'Hired' || progress === 'JobOffer') {
        countMap[jobId].offerCount += count;
      }
    });

    const jobsWithCounts = jobList.map(job => {
      const jobId = job._id.toString();
      const onboardCount = countMap[jobId]?.onboardCount || 0;
      const offerCount = countMap[jobId]?.offerCount || 0;
      return {
        ...job,
        onboardCount,
        offerCount
      };
    });

    res.json({ requisitions: jobsWithCounts, total });
  } catch (err) {
    console.error('❌ Error fetching job requisitions:', err);
    res.status(500).json({ message: 'Error fetching requisitions', error: err.message });
  }
};


// GET /ta/job-requisitions/vacant
exports.getVacantRequisitions = async (req, res) => {
  try {
    const role = req.user?.role;
    const userCompany = req.user?.company;
    const queryCompany = req.query.company;

    const company = role === 'GeneralManager' ? queryCompany : userCompany;
    if (!company) return res.status(400).json({ message: 'Company is required' });

    const vacant = await JobRequisition.find({
      company: company.trim().toUpperCase(),
      status: 'Vacant'
    }).sort({ createdAt: -1 });

    res.json(vacant);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch vacant requisitions', error: err.message });
  }
};
