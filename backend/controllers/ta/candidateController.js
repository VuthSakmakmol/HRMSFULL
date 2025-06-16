const fs = require('fs');
const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');
const Counter = require('../../models/ta/Counter');
const { logActivity } = require('../../utils/logActivity');
const mongoose = require('mongoose');


// 🎯 Generate candidateId based on type and subType
async function generateCandidateId(type, subType) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);

  let prefixType = 'WC'; // default: White Collar

  if (type === 'Blue Collar') {
    prefixType = subType === 'Sewer' ? 'BS' : 'BN';
  }

  const prefix = `${prefixType}${month}${year}`;

  const counter = await Counter.findOneAndUpdate(
    { name: `candidate-${prefix}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}-${counter.value}`;
}


// CREATE
exports.create = async (req, res) => {
  try {
    const {
      fullName,
      recruiter,
      applicationSource,
      jobRequisitionId,
      jobRequisitionCode,
      department,
      jobTitle,
      company,
      type,
      subType
    } = req.body;

    const candidateId = await generateCandidateId(type, subType);

    const progressDates = req.body.progressDates || {};
    if (!progressDates.Application) {
      progressDates.Application = new Date();
    }

    const newCandidate = new Candidate({
      candidateId,
      fullName,
      recruiter,
      applicationSource,
      jobRequisitionId,
      jobRequisitionCode,
      department,
      jobTitle,
      company,
      type,
      subType: type === 'Blue Collar' ? subType : null,
      progressDates
    });

    await newCandidate.save();

    const io = req.app.get('io');                      // ✅ WebSocket instance
    io.emit('candidateAdded', newCandidate);           // ✅ Broadcast to all clients

    await logActivity({
      actionType: 'CREATE',
      collectionName: 'Candidate',
      documentId: newCandidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company,
      previousData: null,
      newData: newCandidate.toObject()
    });

    res.status(201).json({ message: 'Candidate created successfully', candidate: newCandidate });
  } catch (err) {
    console.error('❌ Candidate creation failed:', err);
    res.status(500).json({ message: 'Failed to create candidate', error: err.message });
  }
};

// GET ALL
// ✅ GET ALL — With Pagination and Filters
exports.getAll = async (req, res) => {
  try {
    const role = req.user?.role;
    const userCompany = req.user?.company;
    const queryCompany = req.query.company;

    const company = role === 'GeneralManager' ? queryCompany : userCompany;
    if (!company) return res.status(400).json({ message: 'Company is required' });

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    // Filters
    const {
      candidateId,
      jobId,
      jobTitle,
      department,
      recruiter,
      fullName,
      applicationSource,
      hireDecision,
      type,
      subType
    } = req.query;

    const filter = { company };

    if (candidateId) filter.candidateId = { $regex: candidateId, $options: 'i' };
    if (jobId) filter.jobRequisitionCode = { $regex: jobId, $options: 'i' };
    if (jobTitle) filter.jobTitle = { $regex: jobTitle, $options: 'i' };
    if (department) filter.department = { $regex: department, $options: 'i' };
    if (recruiter) filter.recruiter = { $regex: recruiter, $options: 'i' };
    if (fullName) filter.fullName = { $regex: fullName, $options: 'i' };
    if (applicationSource) filter.applicationSource = applicationSource;
    if (hireDecision) filter.hireDecision = hireDecision;
    if (type) filter.type = type;
    if (subType) filter.subType = subType;

    const [candidates, total] = await Promise.all([
      Candidate.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Candidate.countDocuments(filter)
    ]);

    res.json({ candidates, total });
  } catch (err) {
    console.error('❌ Failed to fetch candidates:', err);
    res.status(500).json({ message: 'Fetch error', error: err.message });
  }
};


// GET ONE
exports.getOne = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ message: 'Fetch error', error: err.message });
  }
};

// UPDATE
// UPDATE
exports.update = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previousData = candidate.toObject();
    const editableFields = ['fullName', 'recruiter', 'applicationSource', 'hireDecision', 'noted'];

    // ✅ Always re-fetch job details if jobRequisitionId is provided
    if (req.body.jobRequisitionId) {
      const newJob = await JobRequisition.findById(req.body.jobRequisitionId);

      if (!newJob) {
        return res.status(404).json({ message: 'Job requisition not found' });
      }

      const jobChanged = String(candidate.jobRequisitionId) !== String(newJob._id);

      // 🔐 Only block change if already Onboarded
      if (candidate.progress === 'Onboard' && jobChanged) {
        return res.status(400).json({ message: 'Cannot change job after Onboard stage' });
      }

      if (jobChanged) {
        candidate.jobRequisitionId = newJob._id;
        candidate.jobRequisitionCode = newJob.jobRequisitionId;
        candidate.department = newJob.departmentName;
        candidate.jobTitle = newJob.jobTitle;
        candidate.type = newJob.type;
        candidate.subType = newJob.subType || null;

        console.log('🔁 Job changed, updated fields:', {
          code: newJob.jobRequisitionId,
          title: newJob.jobTitle,
          dept: newJob.departmentName
        });
      } else {
        // Still sync job fields (if no change)
        candidate.jobTitle = newJob.jobTitle;
        candidate.department = newJob.departmentName;
        candidate.type = newJob.type;
        candidate.subType = newJob.subType || null;

        console.log('🔄 Job ID same, synced job fields from DB');
      }
    }

    // ✅ Update editable fields
    editableFields.forEach((key) => {
      if (req.body[key] !== undefined) candidate[key] = req.body[key];
    });

    await candidate.save();
    const io = req.app.get('io')
    io.emit('candidateUpdated', candidate) // ✅ broadcast updated candidate

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'Candidate',
      documentId: candidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company: candidate.company,
      previousData,
      newData: candidate.toObject()
    });

    // 🔁 Re-evaluate job requisition if hireDecision changed
    if (
      req.body.hireDecision &&
      ['Candidate Refusal', 'Not Hired', 'Candidate in Process'].includes(req.body.hireDecision)
    ) {
      const job = await JobRequisition.findById(candidate.jobRequisitionId);
      if (job) await reevaluateJobStatus(job);
    }

    res.json({ message: 'Candidate updated successfully', candidate });
  } catch (err) {
    console.error('❌ Error updating candidate:', err);
    res.status(500).json({ message: 'Update error', error: err.message });
  }
};





// DELETE
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    const previousData = candidate.toObject()

    await candidate.deleteOne()

    const io = req.app.get('io') // ✅ valid

    io.emit('candidateDeleted', candidate._id) // ✅ correct object ID


    await logActivity({
      actionType: 'DELETE',
      collectionName: 'Candidate',
      documentId: candidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company: candidate.company,
      previousData,
      newData: null
    });

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (job) await reevaluateJobStatus(job);

    res.json({ message: `Candidate ${candidate.candidateId} deleted successfully.` });
  } catch (err) {
    console.error('❌ Error deleting candidate:', err);
    res.status(500).json({ message: 'Error deleting candidate', error: err.message });
  }
};

// UPDATE STAGE
exports.updateStage = async (req, res) => {
  try {
    const { stage, date } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    // ⛔ Block if final decision is refusal
    if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) {
      return res.status(403).json({ message: 'Candidate is marked as refused or not hired' });
    }

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (!job) return res.status(404).json({ message: 'Job requisition not found' });
    if (job.status === 'Cancel') {
      return res.status(403).json({ message: 'Job requisition is cancelled' });
    }

    const previousData = candidate.toObject(); // ✅ snapshot before changes

    const stageOrder = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const currentIndex = stageOrder.indexOf(candidate.progress);
    const targetIndex = stageOrder.indexOf(stage);

    if (targetIndex > currentIndex) {
      candidate.progress = stage;
    }

    // ✅ Safe date handling
    const safeDate = new Date(date);
    if (isNaN(safeDate)) {
      return res.status(400).json({ message: 'Invalid date format provided' });
    }

    candidate.progressDates.set(stage, safeDate);

    if (stage === 'JobOffer' && !candidate._offerCounted) {
      const activeOffers = await Candidate.countDocuments({
        jobRequisitionId: job._id,
        progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
        _offerCounted: true,
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
      });

      if (activeOffers >= job.targetCandidates) {
        return res.status(400).json({ message: 'Job offer is full, cannot proceed' });
      }

      candidate._offerCounted = true;
    }

    if (stage === 'Onboard' && !candidate._onboardCounted) {
      if (!candidate._offerCounted) {
        return res.status(400).json({ message: 'Must reach JobOffer before Onboard' });
      }
      candidate._onboardCounted = true;
      candidate._offerCounted = false;
      candidate.hireDecision = 'Hired';
    }

    await candidate.save();
    await reevaluateJobStatus(job, req);
    const io = req.app.get('io');
    io.emit('candidateUpdated', candidate);

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'Candidate',
      documentId: candidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company: candidate.company,
      previousData,
      newData: candidate.toObject()
    });

    res.json({ message: `${stage} date updated`, candidate });

  } catch (err) {
    console.error('❌ updateStage error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


// Reevaluates Job Requisition Status
async function reevaluateJobStatus(job, req = null) {
  const activeOffers = await Candidate.countDocuments({
    jobRequisitionId: job._id,
    progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
    _offerCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
  });

  const activeOnboard = await Candidate.countDocuments({
    jobRequisitionId: job._id,
    progress: 'Onboard',
    _onboardCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
  });

  job.status =
    activeOnboard >= job.targetCandidates
      ? 'Filled'
      : activeOffers >= job.targetCandidates
      ? 'Suspended'
      : 'Vacant';

  job.offerCount = activeOffers;
  job.onboardCount = activeOnboard;

  await job.save();

  // ✅ Emit real-time updates
  if (req) {
    const io = req.app.get('io');
    io.emit('jobUpdated', job);

    const availability = await getAvailabilityStatus(job._id);
    io.emit('jobAvailabilityChanged', availability);
  }
}



// UPLOAD DOCUMENT
exports.uploadDocument = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const uploaded = req.files.map(file => file.filename);
    candidate.documents.push(...uploaded);
    await candidate.save();

    res.json({ message: 'Uploaded', documents: candidate.documents });
  } catch (err) {
    res.status(500).json({ message: 'Upload error', error: err.message });
  }
};

// DELETE DOCUMENT
exports.deleteDocument = async (req, res) => {
  try {
    const { filename } = req.body;
    const path = `uploads/candidate_docs/${filename}`;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    candidate.documents = candidate.documents.filter(doc => doc !== filename);
    await candidate.save();

    if (fs.existsSync(path)) fs.unlinkSync(path);

    res.json({ message: 'Deleted', documents: candidate.documents });
  } catch (err) {
    res.status(500).json({ message: 'Delete error', error: err.message });
  }
};

exports.getAvailability = async (req, res) => {
  try {
    const status = await getAvailabilityStatus(req.params.id);
    if (!status) return res.status(404).json({ message: 'Job not found' });
    res.json(status);
  } catch (err) {
    res.status(500).json({ message: 'Availability error', error: err.message });
  }
};


// GET JOB AVAILABILITY
async function getAvailabilityStatus(jobId) {
  const job = await JobRequisition.findById(jobId);
  if (!job) return null;

  const offerCount = await Candidate.countDocuments({
    jobRequisitionId: job._id,
    progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
    _offerCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
  });

  const onboardCount = await Candidate.countDocuments({
    jobRequisitionId: job._id,
    progress: 'Onboard',
    _onboardCounted: true
  });

  return {
    jobId: job._id,
    offerFull: offerCount >= job.targetCandidates,
    onboardFull: onboardCount >= job.targetCandidates,
    offerCount,
    onboardCount
  };
}

