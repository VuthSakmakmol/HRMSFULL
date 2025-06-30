exports.enforceCrudPermissions = (req, res, next) => {
  const { role } = req.user;

  if (role === 'GeneralManager') {
    // ✅ GM can do everything anywhere
    return next();
  }

  if (role === 'Manager') {
    if (req.method === 'GET') {
      // ✅ Manager can only read
      return next();
    }
    return res.status(403).json({
      message: 'Managers can only read data; insert/edit/delete are not allowed.'
    });
  }

  if (role === 'HROfficer') {
    // ✅ HROfficer can CRUD only in assigned company
    // Note: company restriction is already handled by authorizeCompanyAccess
    return next();
  }

  return res.status(403).json({ message: 'Unauthorized role' });
};
