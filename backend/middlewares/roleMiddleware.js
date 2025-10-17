// Basic role gate
exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user || {};
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

// Company context enforcement with GM override support
exports.authorizeCompanyAccess = (req, res, next) => {
  const user = req.user;
  const overrideCompany = req.headers['x-company-override'];

  if (user.role === 'GeneralManager') {
    req.company = overrideCompany || user.company || null;
    return next();
  }
  if (user.role === 'Manager') {
    req.company = overrideCompany || user.company || null;
    return next();
  }
  if (user.role === 'HROfficer') {
    req.company = user.company || null; // ignore override
    return next();
  }
  return res.status(403).json({ message: 'Unauthorized role' });
};
