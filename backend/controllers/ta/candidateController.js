const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');
const Counter = require('../../models/ta/Counter');

// 🎯 Generate candidateId like NS0625-01
async function generateCandidateId() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const prefix = `NS${month}${year}`;

  const counter = await Counter.findOneAndUpdate(
    { name: `candidate-${prefix}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `${prefix}-${counter.value}`;
}

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

    const candidateId = await generateCandidateId();

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

    res.status(201).json({ message: 'Candidate created successfully', candidate: newCandidate });
  } catch (err) {
    console.error('❌ Candidate creation failed:', err);
    res.status(500).json({ message: 'Failed to create candidate', error: err.message });
  }
};


// GET ALL
exports.getAll = async (req, res) => {
  try {
    const company = req.user.role === 'GeneralManager' ? req.query.company : req.user.company;
    if (!company) return res.status(400).json({ message: 'Company is required' });

    const candidates = await Candidate.find({ company }).sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
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

// UPDATE BASIC
exports.update = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const updatable = ['fullName', 'recruiter', 'applicationSource', 'hireDecision', 'noted'];
    updatable.forEach(key => {
      if (req.body[key] !== undefined) candidate[key] = req.body[key];
    });

    await candidate.save();

    if (
      req.body.hireDecision &&
      ['Candidate Refusal', 'Not Hired', 'Candidate in Process'].includes(req.body.hireDecision)
    ) {
      const job = await JobRequisition.findById(candidate.jobRequisitionId);
      if (job) await reevaluateJobStatus(job);
    }

    res.json({ message: 'Candidate updated', candidate });
  } catch (err) {
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

    await candidate.deleteOne();

    // ✅ Reevaluate job status after deletion
    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (job) await reevaluateJobStatus(job);

    res.json({ message: `Candidate ${candidate.candidateId} deleted successfully.` });
  } catch (err) {
    console.error('❌ Error deleting candidate:', err);
    res.status(500).json({ message: 'Error deleting candidate', error: err.message });
  }
};


exports.updateStage = async (req, res) => {
  try {
    const { stage, date } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) {
      return res.status(403).json({ message: 'Candidate is marked as refused or not hired' });
    }

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (!job) return res.status(404).json({ message: 'Job requisition not found' });

    if (job.status === 'Cancel') {
      return res.status(403).json({ message: 'Job requisition is cancelled' });
    }

    const stageOrder = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const currentIndex = stageOrder.indexOf(candidate.progress);
    const targetIndex = stageOrder.indexOf(stage);

    if (targetIndex > currentIndex) {
      candidate.progress = stage;
    }

    // ✅ Always allow date update
    candidate.progressDates.set(stage, date || new Date());

    // ✅ Only promote progress if stage is forward
    if (targetIndex > currentIndex) {
      candidate.progress = stage;
    }

    // ✅ Offer count logic
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

    // ✅ Onboard logic
    if (stage === 'Onboard' && !candidate._onboardCounted) {
      if (!candidate._offerCounted) {
        return res.status(400).json({ message: 'Must reach JobOffer before Onboard' });
      }
      candidate._onboardCounted = true;
      candidate._offerCounted = false; // remove offer count

      // ✅ Auto-set final decision
      candidate.hireDecision = 'Hired';
    }


    await candidate.save();
    await reevaluateJobStatus(job);

    res.json({ message: `${stage} date updated`, candidate });

  } catch (err) {
    console.error('❌ updateStage error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


// Re-evaluate Job Requisition status
async function reevaluateJobStatus(job) {
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

  if (activeOnboard >= job.targetCandidates) job.status = 'Filled';
  else if (activeOffers >= job.targetCandidates) job.status = 'Suspended';
  else job.status = 'Vacant';

  job.offerCount = activeOffers;
  job.onboardCount = activeOnboard;

  await job.save();
}

// UPLOAD DOCS
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

// DELETE DOC
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

// GET JOB AVAILABILITY
exports.getAvailability = async (req, res) => {
  try {
    const job = await JobRequisition.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

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

    res.json({
      offerFull: offerCount >= job.targetCandidates,
      onboardFull: onboardCount >= job.targetCandidates
    });
  } catch (err) {
    res.status(500).json({ message: 'Availability error', error: err.message });
  }
};
