// backend/middlewares/roleMiddleware.js
exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user || {};
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

// backend/middlewares/roleMiddleware.js
exports.authorizeCompanyAccess = (req, res, next) => {
  const { role, company: userCompany, companies: gmCompanies } = req.user || {};
  const overrideCompany = req.headers['x-company-override'];

  if (!role) return res.status(403).json({ message: 'Unauthorized role' });

  if (role === 'GeneralManager') {
    if (overrideCompany) {
      if (Array.isArray(gmCompanies) && !gmCompanies.includes(overrideCompany)) {
        return res.status(403).json({ message: 'GM not authorized for this company' });
      }
      req.company = overrideCompany;
    } else {
      req.company = null; // or some default if you want
    }
    return next();
  }

  if (role === 'Manager') {
    req.company = overrideCompany || userCompany || null;
    return next();
  }

  if (role === 'HROfficer') {
    req.company = userCompany || null; // ignore override
    return next();
  }

  return res.status(403).json({ message: 'Unauthorized role' });
};
