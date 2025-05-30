const JobRequisition = require('../../models/ta/JobRequisition');
const Department = require('../../models/ta/Department');
const Counter = require('../../models/ta/Counter');


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

    // Get department to extract company
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
      targetCandidates: 1, // Default
      hiringCost,
      status,
      type,
      subType: resolvedSubType,
      openingDate,
      startDate,
      company // ✅ Set company from department
    });

    await newRequisition.save();

    res.status(201).json({
      message: 'Job requisition created successfully.',
      requisition: newRequisition
    });

  } catch (err) {
    console.error('❌ Error creating job requisition:', err);
    res.status(500).json({ message: 'Failed to create job requisition', error: err.message });
  }
};

exports.getJobRequisitions = async (req, res) => {
  try {
    const role = req.user?.role;
    const userCompany = req.user?.company;
    const queryCompany = req.query.company;

    const companyFilter = role === 'GeneralManager' ? queryCompany : userCompany;

    if (!companyFilter) {
      return res.status(400).json({ message: 'Company is required' });
    }

    const requisitions = await JobRequisition.find({
      company: companyFilter.trim().toUpperCase()
    })
      .sort({ createdAt: -1 })
      .populate('departmentId');

    res.json(requisitions);
  } catch (err) {
    console.error('❌ Error fetching requisitions:', err);
    res.status(500).json({ message: 'Error fetching job requisitions', error: err.message });
  }
};


// 🗑️ Delete a requisition with access control
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

    await JobRequisition.findByIdAndDelete(id);
    res.json({ message: 'Job requisition deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete requisition', error: err.message });
  }
};

// ✏️ Update a requisition with access control
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
    res.json({ message: 'Job requisition updated.', requisition: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update requisition', error: err.message });
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


