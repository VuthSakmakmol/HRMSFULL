// backend/controllers/userController.js
const User = require('../models/User');

// Allowed company codes for creating users
const allowedCompanies = ['CAM-TAC', 'TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS'];

// Get all users (exclude GM)
exports.getAll = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } });
    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Error fetching users', error: err.message });
  }
};

// Names/emails for dropdown (GM/Manager)
exports.getUserEmails = async (req, res) => {
  try {
    const { role, company } = req.user;

    const baseFilter = { role: { $ne: 'GeneralManager' } };

    // Manager should only see their own company
    if (role === 'Manager' && company) {
      baseFilter.company = company;
    }

    const users = await User.find(baseFilter, 'name email company').sort({
      email: 1
    });

    res.json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Failed to fetch user emails', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;

    if (!['Manager', 'HROfficer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!company) {
      return res.status(400).json({ message: 'Company is required' });
    }
    if (!allowedCompanies.includes(company)) {
      return res.status(400).json({ message: 'Unknown company code' });
    }

    const user = new User({ name, email, password, role, company });
    await user.save();

    return res.status(201).json({ message: 'User created', user });
  } catch (err) {
    console.error('❌ Error creating user:', err);

    // 🔹 Validation error (password too short, missing name, etc.)
    if (err.name === 'ValidationError') {
      const errors = {};
      for (const [field, detail] of Object.entries(err.errors)) {
        errors[field] = detail.message;
      }
      return res.status(400).json({
        message: 'Validation failed',
        errors      // { password: 'Password must be at least 6 characters long', ... }
      });
    }

    // 🔹 Duplicate email
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // 🔹 Other unexpected errors
    return res
      .status(500)
      .json({ message: 'Error creating user', error: err.message });
  }
};

// Update name/password/company
exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, password, company } = req.body;

    if (name) user.name = name;
    if (typeof password === 'string' && password.trim().length > 0) {
      user.password = password; // will be hashed by pre('save')
    }
    if (company) user.company = company;

    await user.save();

    res.json({ message: 'User updated', user });
  } catch (err) {
    console.error('❌ Error updating user:', err);
    res
      .status(500)
      .json({ message: 'Error updating user', error: err.message });
  }
};

// Delete user
exports.remove = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.deleteOne();

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('❌ Error deleting user:', err);
    res
      .status(500)
      .json({ message: 'Error deleting user', error: err.message });
  }
};
