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

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email, // ✅ Add this line
        role: user.role,
        company: user.role === 'GeneralManager' ? null : user.company
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
        company: user.company || null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};
