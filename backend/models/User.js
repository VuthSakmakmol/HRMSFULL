// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name:   { type: String, trim: true, required: true },
  email:  { type: String, trim: true, lowercase: true, unique: true, required: true },
  password: {
    type: String,
    required: true,
    minlength: [6, 'Password must be at least 6 characters long'] // 👈 nice message
  },
  role:   { type: String, enum: ['GeneralManager', 'Manager', 'HROfficer'], required: true },
  company:{ type: String, default: null }
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const saltRounds = 10;
  this.password = await bcrypt.hash(this.password, saltRounds);
  next();
});

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
