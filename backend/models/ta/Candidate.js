const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  candidateId: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  recruiter: { type: String, required: true },
  applicationSource: { type: String, required: true },
  company: { type: String, required: true },

  jobRequisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobRequisition',
    required: true,
  },
  jobRequisitionCode: { type: String, required: true },
  department: { type: String, required: true },
  jobTitle: { type: String, required: true },

  type: { type: String, enum: ['White Collar', 'Blue Collar'], required: true },
  subType: { type: String, enum: ['Sewer', 'Non-Sewer', 'General'], default: 'General' },

  progress: { type: String, enum: ['Application', 'ManagerReview', 'Interview', 'JobOffer', 'Hired', 'Onboard'], default: 'Application' },
  progressDates: { type: Map, of: Date, default: {} },
  documents: { type: [String], default: [] },
  hireDecision: { type: String, enum: ['Hired', 'Candidate Refusal', 'Not Hired', 'Candidate in Process'], default: 'Candidate in Process' },

  noted: { type: String, default: '' },
  _offerCounted: { type: Boolean, default: false },
  _onboardCounted: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Candidate', candidateSchema);
