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
    enum: [ // optional enum restriction
      'Thailand Roi Et',
      'Thailand Chaiyaphum',
      'Vietnam A1A Group',
      'Vietnam Transport Co.',
      'Cambodia TAC HRMS'
    ]
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
