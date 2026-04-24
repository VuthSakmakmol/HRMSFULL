// backend/models/ta/Candidate.js

const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    candidateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    recruiter: {
      type: String,
      required: true,
      trim: true,
    },

    applicationSource: {
      type: String,
      required: true,
      trim: true,
    },

    company: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    jobRequisitionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobRequisition',
      required: true,
    },

    jobRequisitionCode: {
      type: String,
      required: true,
      trim: true,
    },

    department: {
      type: String,
      required: true,
      trim: true,
    },

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ['White Collar', 'Blue Collar'],
      required: true,
    },

    subType: {
      type: String,
      enum: ['Sewer', 'Non-Sewer', null],
      default: null,
    },

    progress: {
      type: String,
      enum: [
        'Application',
        'ManagerReview',
        'Interview',
        'JobOffer',
        'Hired',
        'Onboard',
      ],
      default: 'Application',
    },

    progressDates: {
      type: Map,
      of: Date,
      default: {},
    },

    documents: {
      type: [String],
      default: [],
    },

    hireDecision: {
      type: String,
      enum: [
        'Hired',
        'Candidate Refusal',
        'Not Hired',
        'Candidate in Process',
      ],
      default: 'Candidate in Process',
    },

    noted: {
      type: String,
      default: '',
      trim: true,
    },

    _offerCounted: {
      type: Boolean,
      default: false,
    },

    _onboardCounted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

candidateSchema.pre('validate', function normalizeCandidate(next) {
  if (this.company) {
    this.company = String(this.company).trim().toUpperCase();
  }

  if (this.type === 'White Collar') {
    this.subType = null;
  }

  if (this.type === 'Blue Collar' && !this.subType) {
    this.subType = 'Non-Sewer';
  }

  next();
});

candidateSchema.index({
  company: 1,
  type: 1,
  subType: 1,
  progress: 1,
});

candidateSchema.index({
  company: 1,
  type: 1,
  subType: 1,
  hireDecision: 1,
});

candidateSchema.index({
  jobRequisitionId: 1,
});

module.exports = mongoose.model('Candidate', candidateSchema);