exports.authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};

exports.companyAccessControl = (reqCompanyId) => {
  return (req, res, next) => {
    const isSameCompany = req.user.companyId === reqCompanyId;
    if (req.user.role === 'GeneralManager') return next();
    if (req.user.role === 'Manager' || req.user.role === 'HROfficer') {
      if (!isSameCompany) {
        return res.status(403).json({ message: 'Access restricted to own company data' });
      }
    }
    next();
  };
};
