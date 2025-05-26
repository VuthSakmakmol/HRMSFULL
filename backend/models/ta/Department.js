const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['White Collar', 'Blue Collar'],
    required: true,
  },
  subType: {
    type: String,
    enum: ['Sewer', 'Non-Sewer', 'General'],
    default: 'General',
  },
  jobTitles: {
    type: [String],
    default: [],
  },
  recruiters: {
    type: [String],
    default: [],
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('TADepartment', departmentSchema);
