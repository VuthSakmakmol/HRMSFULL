// Derive the effective company context for this request
// backend/utils/getEffectiveCompany.js
exports.getEffectiveCompany = (req) => {
  const role = req.user?.role;
  const override = req.headers['x-company-override'];
  if (role === 'GeneralManager' && override) return override;
  if (role === 'Manager') return override || req.user?.company || null;
  if (role === 'HROfficer') return req.user?.company || null;
  return null;
};
