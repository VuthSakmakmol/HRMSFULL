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
    updatable.forEach(key => {
      if (req.body[key] !== undefined) candidate[key] = req.body[key];
    });

    await candidate.save();
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


// UPDATE STAGE
exports.updateStage = async (req, res) => {
  try {
    const { stage, date } = req.body;
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: 'Not found' });

    const order = ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'];
    const currentIndex = order.indexOf(candidate.progress);
    const newIndex = order.indexOf(stage);

    if (newIndex === -1) return res.status(400).json({ message: 'Invalid stage' });
    if (newIndex < currentIndex) return res.status(400).json({ message: 'Cannot move to earlier stage' });
    if (['Candidate Refusal', 'Not Hired'].includes(candidate.hireDecision)) {
      return res.status(403).json({ message: 'Candidate already rejected/refused' });
    }

    const job = await JobRequisition.findById(candidate.jobRequisitionId);
    if (!job) return res.status(404).json({ message: 'Job Requisition not found' });

    // JobOffer check
    if (stage === 'JobOffer' && !candidate._offerCounted) {
      const totalOffers = await Candidate.countDocuments({
        jobRequisitionId: job._id,
        progress: { $in: ['JobOffer', 'Hired', 'Onboard'] },
        _offerCounted: true
      });

      if (totalOffers >= job.targetCandidates) {
        return res.status(400).json({ message: 'Job offer is full' });
      }

      candidate._offerCounted = true;
    }

    // Onboard check
    if (stage === 'Onboard' && !candidate._onboardCounted) {
      const totalOnboarded = await Candidate.countDocuments({
        jobRequisitionId: job._id,
        progress: 'Onboard',
        _onboardCounted: true
      });

      if (totalOnboarded < job.targetCandidates) {
        candidate._onboardCounted = true;
        job.onboardCount += 1;
        if (job.onboardCount >= job.targetCandidates) {
          job.status = 'Filled';
        }
        await job.save();
      }
    }

    candidate.progress = stage;
    candidate.progressDates.set(stage, date || new Date());
    await candidate.save();

    res.json({ message: 'Stage updated', candidate });
  } catch (err) {
    res.status(500).json({ message: 'Error updating stage', error: err.message });
  }
};



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
