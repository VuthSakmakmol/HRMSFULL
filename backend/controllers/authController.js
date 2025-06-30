const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// POST /api/auth/login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Login failed', error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Login failed', error: 'Incorrect password' });
    }

    let company;
    if (user.role === 'GeneralManager') {
      // GM has access to all companies
      company = ['CAM-TAC', 'TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS'];
    } else {
      // Other roles: single assigned company
      company = user.company;
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        company, // ✅ set properly for GM or others
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};
