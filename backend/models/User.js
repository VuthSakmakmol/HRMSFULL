const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ['GeneralManager', 'Manager', 'HROfficer'],
    required: true
  },

  company: {
  type: String,
  required: function () {
    return this.role !== 'GeneralManager';
  },
  enum: ['CAM-TAC', 'TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS']
}

}, {
  timestamps: true
});

// ✅ Auto-hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model('User', userSchema);
