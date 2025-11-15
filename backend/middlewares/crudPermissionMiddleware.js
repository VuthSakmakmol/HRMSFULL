//backend/middlewares/crudPermissionMiddleware.js
exports.enforceCrudPermissions = (req, res, next) => {
  const { role } = req.user;

  if (role === 'GeneralManager') return next();

  if (role === 'Manager') {
    if (req.method === 'GET') return next();
    return res.status(403).json({ message: 'Managers can only read data; insert/edit/delete are not allowed.' });
  }

  if (role === 'HROfficer') return next();

  return res.status(403).json({ message: 'Unauthorized role' });
};
