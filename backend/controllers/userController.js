const User = require('../models/User');
const { logActivity } = require('../utils/logActivity');

// Get all users (exclude GM)
exports.getAll = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};

// Names/emails for dropdown (GM/Manager)
exports.getUserEmails = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } }, 'name email')
      .sort({ email: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user emails', error: err.message });
  }
};

// Create Manager/HROfficer
exports.create = async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;

    if (!['Manager', 'HROfficer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    if (!company) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const user = new User({ name, email, password, role, company });
    await user.save();

    await logActivity({
      actionType: 'CREATE',
      collectionName: 'User',
      documentId: user._id,
      previousData: null,
      newData: user.toJSON(),
      performedBy: req.user.email,
      company: user.company
    });

    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
};

// Update name/password
exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousData = user.toJSON();
    const { name, password } = req.body;

    if (name) user.name = name;
    if (typeof password === 'string' && password.trim().length > 0) {
      user.password = password;
    }

    await user.save();

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'User',
      documentId: user._id,
      previousData,
      newData: user.toJSON(),
      performedBy: req.user.email,
      company: user.company
    });

    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
};

// Delete user
exports.remove = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousData = user.toJSON();
    await user.deleteOne();

    await logActivity({
      actionType: 'DELETE',
      collectionName: 'User',
      documentId: user._id,
      previousData,
      newData: null,
      performedBy: req.user.email,
      company: user.company
    });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};
