const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['White Collar', 'Blue Collar'], required: true },
  subType: {
    type: String,
    enum: ['Sewer', 'Non-Sewer'],
    required: function () {
      return this.type === 'Blue Collar';
    },
    default: null
  },
  jobTitles: [{ type: String }],
  recruiters: { type: [String], default: [] },
  company: { type: String, required: true }
}, { timestamps: true });

// ✅ Explicitly link to "tadepartments"
module.exports = mongoose.model('Department', departmentSchema, 'tadepartments');
