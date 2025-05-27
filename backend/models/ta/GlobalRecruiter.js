const mongoose = require('mongoose');

const globalRecruiterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: false // ✅ not globally unique — only per company
  },
  company: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('GlobalRecruiter', globalRecruiterSchema);
