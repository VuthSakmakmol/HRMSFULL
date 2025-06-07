const User = require('../models/User');

// ✅ Get all users (excluding General Manager)
exports.getAll = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching users', error: err.message });
  }
};

// ✅ Get all user emails + names for dropdown
exports.getUserEmails = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'GeneralManager' } }, 'name email').sort({ email: 1 });
    res.json(users); // return full objects with name and email
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
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    res.status(500).json({ message: 'Error creating user', error: err.message });
  }
};

// ✅ Update name or password
exports.update = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, password } = req.body;
    if (name) user.name = name;
    if (password) user.password = password;

    await user.save();
    res.json({ message: 'User updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Error updating user', error: err.message });
  }
};

// ✅ Delete user
exports.remove = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await user.remove();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user', error: err.message });
  }
};
