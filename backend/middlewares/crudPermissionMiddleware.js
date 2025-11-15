// backend/middlewares/crudPermissionMiddleware.js
exports.enforceCrudPermissions = (req, res, next) => {
  const { role } = req.user || {};

  if (!role) {
    return res.status(401).json({ message: 'Unauthorized: missing role' });
  }

  // All three roles can call CRUD endpoints;
  // company scope is enforced in authorizeCompanyAccess.
  if (['GeneralManager', 'Manager', 'HROfficer'].includes(role)) {
    return next();
  }

  return res.status(403).json({ message: 'Unauthorized role' });
};
