const mongoose = require('mongoose');

const jobRequisitionSchema = new mongoose.Schema({
  jobRequisitionId: { type: String, required: true, unique: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  departmentName: { type: String, required: true },
  company: { type: String, required: true }, // ✅ company info

  jobTitle: { type: String, required: true },
  recruiter: { type: String, required: true },
  targetCandidates: { type: Number, default: 1 },
  filledCandidates: { type: Number, default: 0 },
  hiringCost: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['Vacant', 'Suspended', 'Filled', 'Cancel'],
    default: 'Vacant'
  },

  openingDate: { type: Date, required: true },
  startDate: { type: Date },

  type: {
    type: String,
    enum: ['White Collar', 'Blue Collar'],
    required: true
  },

  subType: {
    type: String,
    enum: ['Sewer', 'Non-Sewer'],
    default: function () {
      return this.type === 'Blue Collar' ? 'Non-Sewer' : undefined;
    }
  },

  onboardCount: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('JobRequisition', jobRequisitionSchema);
