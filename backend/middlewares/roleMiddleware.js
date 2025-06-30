// ────────────────────────────────────────────────────────────────────────────────
// Authorize by Role (e.g., restrict endpoint to GM/Manager)
exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

// ────────────────────────────────────────────────────────────────────────────────
// Authorize company access with override for GM
// - GeneralManager: can override company via x-company-override header
// - Manager/HROfficer: forced to their assigned token company
exports.authorizeCompanyAccess = (req, res, next) => {
  const user = req.user; // set by authenticate middleware
  const overrideCompany = req.headers['x-company-override'];

  if (user.role === 'GeneralManager') {
    // ✅ GM can override company context
    req.company = overrideCompany || user.company;
    return next();
  }

  if (user.role === 'Manager') {
    // ✅ Manager can read all companies, but can't CRUD outside assigned company (enforced by CRUD permissions)
    req.company = overrideCompany || user.company;
    return next();
  }

  if (user.role === 'HROfficer') {
    // ✅ HROfficer strictly locked to their token company; ignore override
    req.company = user.company;
    return next();
  }

  return res.status(403).json({ message: 'Unauthorized role' });
};
