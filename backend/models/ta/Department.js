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
  company: { type: String, required: true },
}, { timestamps: true });

// ✅ Prevent OverwriteModelError if model is already compiled elsewhere
module.exports =
  mongoose.models.Department ||
  mongoose.model('Department', departmentSchema, 'tadepartments');
