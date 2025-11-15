//backend/middlewares.authMiddleware.js
const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized: token missing' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // expected fields: { userId, email, role, company, companies }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
};
