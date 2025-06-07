const User = require('../models/User');
const ActivityLog = require('../models/ta/ActivityLog');

// ✅ Get all users (excluding General Manager)
exports.getAll = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};

// ✅ Get user emails and names for filter dropdown
exports.getUserEmails = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } }, 'name email').sort({ email: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch user emails', error: err.message });
  }
};

// ✅ Create Manager or HR Officer
exports.create = async (req, res) => {
  try {
    const { name, email, password, role, company } = req.body;

    if (!['Manager', 'HROfficer'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    if (!company && role !== 'GeneralManager') {
      return res.status(400).json({ message: 'Company name is required' });
    }

    const user = new User({
      name,
      email,
      password,
      role,
      company: role === 'GeneralManager' ? undefined : company
    });

    await user.save();

    // 📝 Log creation
    await ActivityLog.create({
      actionType: 'CREATE',
      collectionName: 'User',
      documentId: user._id,
      newData: user.toObject(),
      performedBy: req.user.email,
      company: req.user.company
    });

    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
};

// ✅ Update name or password (with activity log)
exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousData = user.toObject(); // 🔁 snapshot before update

    const { name, password } = req.body;
    if (name) user.name = name;
    if (password) user.password = password;

    await user.save();

    // 📝 Log update
    await ActivityLog.create({
      actionType: 'UPDATE',
      collectionName: 'User',
      documentId: user._id,
      previousData,
      newData: user.toObject(),
      performedBy: req.user.email,
      company: req.user.company
    });

    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
};

// ✅ Delete user (with activity log)
exports.remove = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const previousData = user.toObject();

    await user.remove();

    // 📝 Log deletion
    await ActivityLog.create({
      actionType: 'DELETE',
      collectionName: 'User',
      documentId: user._id,
      previousData,
      performedBy: req.user.email,
      company: req.user.company
    });

    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};
