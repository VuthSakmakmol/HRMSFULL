const JobRequisition = require('../../models/ta/JobRequisition');
const Department = require('../../models/ta/Department');
const Counter = require('../../models/ta/Counter');


// 📦 Fetch all job titles with department info
exports.getAllJobTitles = async (req, res) => {
  try {
    const departments = await Department.find({}, 'name jobTitles type subType company');

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
      targetCandidates: 1, // Default single entry
      hiringCost,
      status,
      type,
      subType: resolvedSubType,
      openingDate,
      startDate
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

// 📄 Get all requisitions
exports.getJobRequisitions = async (req, res) => {
  try {
    const requisitions = await JobRequisition.find().sort({ createdAt: -1 }).populate('departmentId');
    res.json(requisitions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching job requisitions', error: err.message });
  }
};

// 🗑️ Delete a requisition
exports.deleteJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await JobRequisition.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Requisition not found' });
    }

    res.json({ message: 'Job requisition deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete requisition', error: err.message });
  }
};

// ✏️ Update a requisition
exports.updateJobRequisition = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;

    const job = await JobRequisition.findByIdAndUpdate(id, update, { new: true });

    if (!job) {
      return res.status(404).json({ message: 'Requisition not found' });
    }

    res.json({ message: 'Job requisition updated.', requisition: job });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update requisition', error: err.message });
  }
};
