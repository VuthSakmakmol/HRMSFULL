const JobRequisition = require('../../models/ta/JobRequisition');

let counter = 1; // Optional: can also store in DB for persistence

function generateJobRequisitionId() {
  return `BJR1-${counter++}`;
}

exports.getAll = async (req, res) => {
  const filter = req.user.role === 'GeneralManager'
    ? {}
    : { companyId: req.user.companyId };

  const data = await JobRequisition.find(filter).sort({ createdAt: -1 });
  res.json(data);
};

exports.getOne = async (req, res) => {
  const data = await JobRequisition.findById(req.params.id);
  if (!data) return res.status(404).json({ message: 'Not found' });
  res.json(data);
};

exports.create = async (req, res) => {
  const {
    departmentId,
    jobTitle,
    recruiter,
    targetCandidates,
    hiringCost,
    openingDate,
    startDate,
    type,
    subType
  } = req.body;

  const newJob = new JobRequisition({
    jobRequisitionId: generateJobRequisitionId(),
    departmentId,
    jobTitle,
    recruiter,
    targetCandidates,
    hiringCost,
    openingDate,
    startDate,
    type,
    subType
  });

  await newJob.save();
  res.status(201).json({ message: 'Created', jobRequisition: newJob });
};

exports.update = async (req, res) => {
  const job = await JobRequisition.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Not found' });

  const updatableFields = [
    'recruiter', 'targetCandidates', 'hiringCost',
    'status', 'openingDate', 'startDate'
  ];

  for (const field of updatableFields) {
    if (req.body[field] !== undefined) job[field] = req.body[field];
  }

  await job.save();
  res.json({ message: 'Updated', jobRequisition: job });
};

exports.remove = async (req, res) => {
  const job = await JobRequisition.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Not found' });

  await job.remove();
  res.json({ message: 'Deleted' });
};
