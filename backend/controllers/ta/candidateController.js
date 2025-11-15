//backend/controllers/ta/candidateController.js
const fs = require('fs');
const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');
const Counter = require('../../models/ta/Counter');
const { logActivity } = require('../../utils/logActivity');

// 🎯 Generate candidateId with type/subtype-based prefix
async function generateCandidateId(type, subType) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  let prefixType = 'WC';
  if (type === 'Blue Collar') prefixType = subType === 'Sewer' ? 'BS' : 'BN';
  const prefix = `${prefixType}${month}${year}`;
  const counter = await Counter.findOneAndUpdate(
    { name: `candidate-${prefix}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}-${counter.value}`;
}

// ─────────────────────────────────────────────
// CREATE candidate
exports.create = async (req, res) => {
  try {
    const company = req.company; // 🔒 from authorizeCompanyAccess
    const {
      fullName, recruiter, applicationSource, jobRequisitionId,
      jobRequisitionCode, department, jobTitle, type, subType
    } = req.body;

    const candidateId = await generateCandidateId(type, subType);
    const progressDates = req.body.progressDates || {};
    if (!progressDates.Application) progressDates.Application = new Date();

    const newCandidate = new Candidate({
      candidateId, fullName, recruiter, applicationSource,
      jobRequisitionId, jobRequisitionCode, department, jobTitle, company,
      type, subType: type === 'Blue Collar' ? subType : null,
      progressDates
    });

    await newCandidate.save();
    req.app.get('io').emit('candidateAdded', newCandidate);

    await logActivity({
      actionType: 'CREATE', collectionName: 'Candidate',
      documentId: newCandidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company, previousData: null,
      newData: newCandidate.toObject()
    });

    res.status(201).json({ message: 'Candidate created successfully', candidate: newCandidate });
  } catch (err) {
    console.error('❌ Error creating candidate:', err);
    res.status(500).json({ message: 'Failed to create candidate', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET all candidates (with pagination & filters)
exports.getAll = async (req, res) => {
  try {
    const company = req.company; // 🔒 forced by authorizeCompanyAccess

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 25;
    const skip = (page - 1) * limit;

    const {
      candidateId, jobId, jobTitle, department,
      recruiter, fullName, applicationSource,
      hireDecision, type, subType, jobRequisitionId
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
    if (jobRequisitionId) filter.jobRequisitionId = jobRequisitionId;

    const [candidates, total] = await Promise.all([
      Candidate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Candidate.countDocuments(filter)
    ]);

    res.json({ candidates, total });
  } catch (err) {
    console.error('❌ Error fetching candidates:', err);
    res.status(500).json({ message: 'Fetch error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET single candidate by ID
exports.getOne = async (req, res) => {
  try {
    const company = req.company;
    const candidate = await Candidate.findOne({ _id: req.params.id, company });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    res.json(candidate);
  } catch (err) {
    console.error('❌ Error fetching candidate:', err);
    res.status(500).json({ message: 'Fetch error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE candidate
exports.update = async (req, res) => {
  try {
    const company = req.company;
    const candidate = await Candidate.findOne({ _id: req.params.id, company });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const previousData = candidate.toObject();
    const editableFields = ['fullName', 'recruiter', 'applicationSource', 'hireDecision', 'noted'];

    if (req.body.jobRequisitionId) {
      const newJob = await JobRequisition.findById(req.body.jobRequisitionId);
      if (!newJob) return res.status(404).json({ message: 'Job requisition not found' });
      const jobChanged = String(candidate.jobRequisitionId) !== String(newJob._id);
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
      }
    }

    editableFields.forEach(key => {
      if (req.body[key] !== undefined) candidate[key] = req.body[key];
    });

    await candidate.save();
    req.app.get('io').emit('candidateUpdated', candidate);

    await logActivity({
      actionType: 'UPDATE', collectionName: 'Candidate',
      documentId: candidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company,
      previousData,
      newData: candidate.toObject()
    });

    if (
      req.body.hireDecision &&
      ['Candidate Refusal', 'Not Hired', 'Candidate in Process'].includes(req.body.hireDecision)
    ) {
      const job = await JobRequisition.findById(candidate.jobRequisitionId);
      if (job) await reevaluateJobStatus(job, req);
    }

    res.json({ message: 'Candidate updated successfully', candidate });
  } catch (err) {
    console.error('❌ Error updating candidate:', err);
    res.status(500).json({ message: 'Update error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE candidate
exports.remove = async (req, res) => {
  try {
    const company = req.company;
    const candidate = await Candidate.findOne({ _id: req.params.id, company });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const previousData = candidate.toObject();
    await candidate.deleteOne();
    req.app.get('io').emit('candidateDeleted', candidate._id);

    await logActivity({
      actionType: 'DELETE', collectionName: 'Candidate',
      documentId: candidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company,
      previousData,
      newData: null
    });

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (job) await reevaluateJobStatus(job, req);

    res.json({ message: `Candidate ${candidate.candidateId} deleted successfully.` });
  } catch (err) {
    console.error('❌ Error deleting candidate:', err);
    res.status(500).json({ message: 'Delete error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// UPDATE candidate stage (progress + date)
exports.updateStage = async (req, res) => {
  try {
    const { stage, date } = req.body;
    const company = req.company;
    const candidate = await Candidate.findOne({ _id: req.params.id, company });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) {
      return res.status(403).json({ message: 'Candidate is marked as refused or not hired' });
    }

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (!job) return res.status(404).json({ message: 'Job requisition not found' });
    if (job.status === 'Cancel') return res.status(403).json({ message: 'Job requisition is cancelled' });

    const previousData = candidate.toObject();
    const stageOrder = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const currentIndex = stageOrder.indexOf(candidate.progress);
    const targetIndex = stageOrder.indexOf(stage);
    if (targetIndex > currentIndex) candidate.progress = stage;

    const safeDate = new Date(date);
    if (isNaN(safeDate)) return res.status(400).json({ message: 'Invalid date format provided' });
    candidate.progressDates.set(stage, safeDate);

    if (stage === 'JobOffer' && !candidate._offerCounted) {
      const activeOffers = await Candidate.countDocuments({
        jobRequisitionId: job._id,
        progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
        _offerCounted: true,
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
      });
      if (activeOffers >= job.targetCandidates) return res.status(400).json({ message: 'Job offer is full' });
      candidate._offerCounted = true;
    }

    if (stage === 'Onboard' && !candidate._onboardCounted) {
      if (!candidate._offerCounted) return res.status(400).json({ message: 'Must reach JobOffer before Onboard' });
      candidate._onboardCounted = true;
      candidate.hireDecision = 'Hired';
    }

    await candidate.save();
    await reevaluateJobStatus(job, req);
    req.app.get('io').emit('candidateUpdated', candidate);

    await logActivity({
      actionType: 'UPDATE', collectionName: 'Candidate',
      documentId: candidate._id,
      performedBy: req.user?.email || 'Excel Import',
      company,
      previousData,
      newData: candidate.toObject()
    });

    res.json({ message: `${stage} date updated`, candidate });
  } catch (err) {
    console.error('❌ Error updating stage:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// Helper: reevaluate job status based on candidate progress
async function reevaluateJobStatus(job, req = null) {
  const jobId = job._id;
  const offerCount = await Candidate.countDocuments({
    jobRequisitionId: jobId,
    progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
    _offerCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
  });
  const onboardCount = await Candidate.countDocuments({
    jobRequisitionId: jobId,
    progress: 'Onboard',
    _onboardCounted: true
  });

  job.offerCount = offerCount;
  job.onboardCount = onboardCount;
  job.status = onboardCount >= job.targetCandidates ? 'Filled'
               : offerCount >= job.targetCandidates ? 'Suspended'
               : 'Vacant';

  await job.save();
  const refreshed = await JobRequisition.findById(jobId).lean();
  if (req) {
    req.app.get('io').emit('jobUpdated', { ...refreshed, offerCount, onboardCount });
  }
}

async function reevaluateJobStatus(job, req = null) {
  const jobId = job._id;
  const offerCount = await Candidate.countDocuments({
    jobRequisitionId: jobId,
    progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
    _offerCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
  });
  const onboardCount = await Candidate.countDocuments({
    jobRequisitionId: jobId,
    progress: 'Onboard',
    _onboardCounted: true
  });

  job.offerCount = offerCount;
  job.onboardCount = onboardCount;
  job.status = onboardCount >= job.targetCandidates ? 'Filled'
               : offerCount >= job.targetCandidates ? 'Suspended'
               : 'Vacant';

  await job.save();
  const refreshed = await JobRequisition.findById(jobId).lean();
  if (req) {
    const io = req.app.get('io');
    io.emit('jobUpdated', { ...refreshed, offerCount, onboardCount });
  }
}

// ─────────────────────────────────────────────
// UPLOAD candidate documents
exports.uploadDocument = async (req, res) => {
  try {
    const company = req.company;
    const candidate = await Candidate.findOne({ _id: req.params.id, company });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const uploaded = req.files.map(file => file.filename);
    candidate.documents.push(...uploaded);
    await candidate.save();
    res.json({ message: 'Uploaded', documents: candidate.documents });
  } catch (err) {
    console.error('❌ Error uploading documents:', err);
    res.status(500).json({ message: 'Upload error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE candidate document
exports.deleteDocument = async (req, res) => {
  try {
    const company = req.company;
    const candidate = await Candidate.findOne({ _id: req.params.id, company });
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });
    const { filename } = req.body;
    const path = `uploads/candidate_docs/${filename}`;
    candidate.documents = candidate.documents.filter(doc => doc !== filename);
    await candidate.save();
    if (fs.existsSync(path)) fs.unlinkSync(path);
    res.json({ message: 'Deleted', documents: candidate.documents });
  } catch (err) {
    console.error('❌ Error deleting document:', err);
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

// ─────────────────────────────────────────────
// GET job availability (offer/onboard counts vs target)
exports.getAvailability = async (req, res) => {
  try {
    const status = await getAvailabilityStatus(req.params.id);
    if (!status) return res.status(404).json({ message: 'Job not found' });
    res.json(status);
  } catch (err) {
    console.error('❌ Error checking availability:', err);
    res.status(500).json({ message: 'Availability error', error: err.message });
  }
};

// ─────────────────────────────────────────────
// HELPER: Get current job offer/onboard availability
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

// ─────────────────────────────────────────────
// HELPER: Reevaluate job status when candidate progress changes
async function reevaluateJobStatus(job, req = null) {
  const jobId = job._id;
  const offerCount = await Candidate.countDocuments({
    jobRequisitionId: jobId,
    progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
    _offerCounted: true,
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
  });
  const onboardCount = await Candidate.countDocuments({
    jobRequisitionId: jobId,
    progress: 'Onboard',
    _onboardCounted: true
  });

  job.offerCount = offerCount;
  job.onboardCount = onboardCount;
  job.status = onboardCount >= job.targetCandidates ? 'Filled'
               : offerCount >= job.targetCandidates ? 'Suspended'
               : 'Vacant';

  await job.save();
  const refreshed = await JobRequisition.findById(jobId).lean();
  if (req) {
    const io = req.app.get('io');
    io.emit('jobUpdated', { ...refreshed, offerCount, onboardCount });
  }
}
