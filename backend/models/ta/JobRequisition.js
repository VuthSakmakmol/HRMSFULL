// backend/models/ta/JobRequisition.js

const mongoose = require('mongoose');

const jobRequisitionSchema = new mongoose.Schema(
  {
    jobRequisitionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },

    departmentName: {
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

    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },

    recruiter: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ Requested HC from requisition.
    // Roadmap requestedHC will sum this from old + new requisitions.
    targetCandidates: {
      type: Number,
      default: 1,
      min: 0,
    },

    filledCandidates: {
      type: Number,
      default: 0,
      min: 0,
    },

    hiringCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ['Vacant', 'Suspended', 'Filled', 'Cancel'],
      default: 'Vacant',
    },

    openingDate: {
      type: Date,
      required: true,
    },

    startDate: {
      type: Date,
      default: null,
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

    onboardCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    offerCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    latestOnboardDate: {
      type: Date,
      default: null,
    },

    daysToFill: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

jobRequisitionSchema.pre('validate', function normalizeJobRequisition(next) {
  if (this.company) {
    this.company = String(this.company).trim().toUpperCase();
  }

  if (this.departmentName) {
    this.departmentName = String(this.departmentName).trim();
  }

  if (this.jobTitle) {
    this.jobTitle = String(this.jobTitle).trim();
  }

  if (this.recruiter) {
    this.recruiter = String(this.recruiter).trim();
  }

  if (this.type === 'White Collar') {
    this.subType = null;
  }

  if (this.type === 'Blue Collar' && !this.subType) {
    this.subType = 'Non-Sewer';
  }

  this.targetCandidates = Math.max(0, Number(this.targetCandidates || 0));
  this.filledCandidates = Math.max(0, Number(this.filledCandidates || 0));
  this.hiringCost = Math.max(0, Number(this.hiringCost || 0));
  this.onboardCount = Math.max(0, Number(this.onboardCount || 0));
  this.offerCount = Math.max(0, Number(this.offerCount || 0));

  next();
});

jobRequisitionSchema.index({
  company: 1,
  type: 1,
  subType: 1,
  openingDate: 1,
});

jobRequisitionSchema.index({
  company: 1,
  status: 1,
});

module.exports = mongoose.model('JobRequisition', jobRequisitionSchema);