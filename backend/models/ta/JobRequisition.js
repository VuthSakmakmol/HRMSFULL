const mongoose = require('mongoose');

const jobRequisitionSchema = new mongoose.Schema({
  jobRequisitionId: {
    type: String,
    required: true,
    unique: true,
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TADepartment',
    required: true,
  },
  jobTitle: { type: String, required: true },
  recruiter: { type: String, required: true },
  targetCandidates: { type: Number, required: true },
  filledCandidates: { type: Number, default: 0 },
  onboardCount: { type: Number, default: 0 },
  hiringCost: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Vacant', 'Filled', 'Suspended', 'Canceled'],
    default: 'Vacant',
  },
  openingDate: { type: Date },
  startDate: { type: Date },

  type: {
    type: String,
    enum: ['White Collar', 'Blue Collar'],
    required: true,
  },
  subType: {
    type: String,
    enum: ['Sewer', 'Non-Sewer', 'General'],
    default: 'General',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('TAJobRequisition', jobRequisitionSchema);
