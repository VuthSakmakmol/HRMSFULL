const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  // Expect Authorization: Bearer <token>
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // must include at least { role, company } in your token payload
    next();
  } catch (err) {
    console.error('❌ Invalid token:', err.message);
    return res.status(401).json({ message: 'Unauthorized: invalid token' });
  }
};
