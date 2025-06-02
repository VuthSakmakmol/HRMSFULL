const Candidate = require('../../models/ta/Candidate');
const JobRequisition = require('../../models/ta/JobRequisition');
const Counter = require('../../models/ta/Counter');

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
  console.log('📥 Incoming payload:', req.body);

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

    const role = req.user.role;
    const userCompany = req.user.company;
    const resolvedCompany = role === 'GeneralManager' ? company : userCompany;

    if (!resolvedCompany) {
      return res.status(400).json({ message: 'Company is required' });
    }

    // ✅ Field validation
    if (!jobRequisitionId) return res.status(400).json({ message: 'Missing jobRequisitionId' });
    if (!jobRequisitionCode) return res.status(400).json({ message: 'Missing jobRequisitionCode' });
    if (!department) return res.status(400).json({ message: 'Missing department name' });
    if (!jobTitle) return res.status(400).json({ message: 'Missing jobTitle' });
    if (!recruiter) return res.status(400).json({ message: 'Missing recruiter' });

    // ✅ Properly await ID generation
    const candidateId = await generateCandidateId();

    const candidate = new Candidate({
      candidateId,
      fullName,
      recruiter,
      applicationSource,
      jobRequisitionId,
      jobRequisitionCode,
      department,
      jobTitle,
      type,
      subType,
      company: resolvedCompany,
      progress: 'Application',
      progressDates: {
        Application: new Date()
      }
    });

    await candidate.save();

    res.status(201).json({
      message: 'Candidate created',
      candidate
    });

  } catch (err) {
    console.error('❌ Error creating candidate:', err);
    res.status(500).json({ message: 'Error creating candidate', error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const role = req.user.role;
    const userCompany = req.user.company;
    const queryCompany = req.query.company;

    const resolvedCompany =
      role === 'GeneralManager' ? queryCompany : userCompany;

    if (!resolvedCompany) {
      return res.status(400).json({ message: 'Missing company info' });
    }

    const candidates = await Candidate.find({ company: resolvedCompany }).sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching candidates', error: err.message });
  }
};


// READ ONE
exports.getOne = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Not found' });
    res.json(candidate);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching candidate', error: err.message });
  }
};

// UPDATE CANDIDATE BASIC FIELDS
exports.update = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Not found' });

    const updatable = ['fullName', 'recruiter', 'applicationSource', 'hireDecision', 'noted'];
    const oldHireDecision = candidate.hireDecision;

    updatable.forEach(key => {
      if (req.body[key] !== undefined) {
        candidate[key] = req.body[key];
      }
    });

    await candidate.save();

    // 🧠 If hireDecision changed, recalculate job requisition status
    if (
      req.body.hireDecision &&
      ['Candidate Refusal', 'Not Hired', 'Candidate in Process'].includes(req.body.hireDecision) &&
      candidate.jobRequisitionId
    ) {
      const job = await JobRequisition.findById(candidate.jobRequisitionId);
      if (job) await reevaluateJobStatus(job);
    }

    res.json({ message: 'Candidate updated', candidate });
  } catch (err) {
    res.status(500).json({ message: 'Error updating candidate', error: err.message });
  }
};


// DELET
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    await candidate.deleteOne();

    res.json({ message: `Candidate ${candidate.candidateId} deleted successfully.` });
  } catch (err) {
    console.error('❌ Error deleting candidate:', err);
    res.status(500).json({ message: 'Error deleting candidate', error: err.message });
  }
};


// ============================ Stage ============================

// Helper: Recalculate job status
async function reevaluateJobStatus(job) {
  const activeOffers = await Candidate.countDocuments({
    jobRequisitionId: job._id,
    progress: 'JobOffer', // ✅ only exact match
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
    _offerCounted: true
  });


  const activeOnboard = await Candidate.countDocuments({
    jobRequisitionId: job._id,
    progress: 'Onboard',
    hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
    _onboardCounted: true
  });

  if (activeOnboard >= job.targetCandidates) {
    job.status = 'Filled';
  } else if (activeOffers >= job.targetCandidates) {
    job.status = 'Suspended';
  } else {
    job.status = 'Vacant';
  }

  job.offerCount = activeOffers;
  job.onboardCount = activeOnboard;

  await job.save();
}

exports.updateStage = async (req, res) => {
  try {
    const { stage, date } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const order = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const currentIndex = order.indexOf(candidate.progress);
    const newIndex = order.indexOf(stage);
    if (newIndex === -1) return res.status(400).json({ message: 'Invalid stage' });
    if (newIndex < currentIndex) return res.status(400).json({ message: 'Cannot move to earlier stage' });

    if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) {
      return res.status(403).json({ message: 'Candidate already refused or rejected' });
    }

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (!job) return res.status(404).json({ message: 'Job Requisition not found' });

    // If job is cancelled, reject all stage changes
    if (job.status === 'Cancel') {
      return res.status(403).json({ message: 'Job requisition is cancelled' });
    }

    // --- STAGE: Job Offer ---
    if (stage === 'JobOffer' && !candidate._offerCounted) {
      const offerCount = await Candidate.countDocuments({
        jobRequisitionId: job._id,
        progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
        _offerCounted: true,
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
      });

      if (offerCount >= job.targetCandidates) {
        return res.status(400).json({ message: 'Job offer is full' });
      }

      candidate._offerCounted = true;
    }

    // --- STAGE: Onboard ---
    if (stage === 'Onboard' && !candidate._onboardCounted) {
      const onboardCount = await Candidate.countDocuments({
        jobRequisitionId: job._id,
        progress: 'Onboard',
        _onboardCounted: true,
        hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] }
      });

      if (onboardCount < job.targetCandidates) {
        candidate._onboardCounted = true;
        job.onboardCount += 1;

        if (job.onboardCount >= job.targetCandidates) {
          job.status = 'Filled';
        }
      }
    }

    // --- Progress & Date Update ---
    candidate.progress = stage;
    candidate.progressDates.set(stage, date || new Date());

    // Auto-assign final decision if Onboarded
    if (stage === 'Onboard') {
      candidate.hireDecision = 'Hired';
    }

    await candidate.save();

    // --- Auto-update job status ---
    const activeOffers = await Candidate.countDocuments({
      jobRequisitionId: job._id,
      progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
      hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
      _offerCounted: true
    });

    const activeOnboards = await Candidate.countDocuments({
      jobRequisitionId: job._id,
      progress: 'Onboard',
      hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] },
      _onboardCounted: true
    });

    if (activeOnboards >= job.targetCandidates) {
      job.status = 'Filled';
    } else if (activeOffers >= job.targetCandidates) {
      job.status = 'Suspended';
    } else {
      job.status = 'Vacant';
    }

    await job.save();

    res.json({ message: 'Stage updated successfully', candidate });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};


// =================================== End Stage ==================================

// UPLOAD DOCUMENT
exports.uploadDocument = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    const uploadedFiles = req.files.map(file => file.filename); // store file name
    candidate.documents.push(...uploadedFiles);
    await candidate.save();

    res.json({ message: 'Documents uploaded', documents: candidate.documents });
  } catch (err) {
    res.status(500).json({ message: 'Upload error', error: err.message });
  }
};

// DELETE DOCUMENT
exports.deleteDocument = async (req, res) => {
  const { filename } = req.body;
  const fs = require('fs');
  const filePath = `uploads/candidate_docs/${filename}`;

  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Candidate not found' });

    candidate.documents = candidate.documents.filter(doc => doc !== filename);
    await candidate.save();

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({ message: 'Document deleted', documents: candidate.documents });
  } catch (err) {
    res.status(500).json({ message: 'Delete error', error: err.message });
  }
};


// GET /job-requisitions/:id/availability
exports.getAvailability = async (req, res) => {
  try {
    const job = await JobRequisition.findById(req.params.id)
    if (!job) return res.status(404).json({ message: 'Job not found' })

    const totalOffers = await Candidate.countDocuments({
      jobRequisitionId: job._id,
      progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
      _offerCounted: true,
      hireDecision: { $nin: ['Candidate Refusal', 'Not Hired'] } // 💥 exclude refused
    });


    const totalOnboard = await Candidate.countDocuments({
      jobRequisitionId: job._id,
      progress: 'Onboard',
      _onboardCounted: true
    })

    res.json({
      offerFull: totalOffers >= job.targetCandidates,
      onboardFull: totalOnboard >= job.targetCandidates
    })
  } catch (err) {
    res.status(500).json({ message: 'Failed to get availability', error: err.message })
  }
}
