// backend/middlewares/roleMiddleware.js
const KNOWN_COMPANIES = ['CAM-TAC', 'TH-ROI', 'TH-CYP', 'VN-A1A', 'VN-TRANS'];

const normalizeCompany = (c) =>
  (c || '').trim().toUpperCase() || null;

exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const { role } = req.user || {};
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role' });
    }
    next();
  };
};

/**
 * Company context enforcement
 *
 * - GM:
 *    - can READ/WRITE any company
 *    - company picked from header/query/body: x-company-override || ?company || body.company
 *
 * - Manager:
 *    - GET  : can VIEW any company (if provided), otherwise own company
 *    - WRITE: can only modify their own company (ignore override; force own)
 *
 * - HROfficer:
 *    - GET/WRITE: only their own company, ignore overrides
 *
 * req.company = effective company for the controller.
 */
exports.authorizeCompanyAccess = (req, res, next) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized: no user in request' });
  }

  const role   = user.role;
  const method = req.method.toUpperCase();

  const overrideHeader = normalizeCompany(req.headers['x-company-override']);
  const queryCompany   = normalizeCompany(req.query.company);
  const bodyCompany    = normalizeCompany(req.body?.company);
  const requestedCompany = overrideHeader || queryCompany || bodyCompany;

  const userCompany = normalizeCompany(user.company);

  // ───── General Manager ───────────────────────────────────────────
  if (role === 'GeneralManager') {
    req.company = requestedCompany;

    // optional safety
    if (req.company && !KNOWN_COMPANIES.includes(req.company)) {
      return res.status(400).json({ message: 'Unknown company code' });
    }

    return next();
  }

  // ───── Manager ───────────────────────────────────────────────────
  if (role === 'Manager') {
    if (!userCompany) {
      return res.status(400).json({ message: 'Manager has no company assigned' });
    }

    if (method === 'GET') {
      // Manager can view any company (if requested), otherwise own
      req.company = requestedCompany || userCompany;

      if (req.company && !KNOWN_COMPANIES.includes(req.company)) {
        return res.status(400).json({ message: 'Unknown company code' });
      }

      return next();
    }

    // WRITE (POST/PUT/PATCH/DELETE): only own company
    req.company = userCompany;

    if (requestedCompany && requestedCompany !== userCompany) {
      return res.status(403).json({
        message: 'Managers can only modify data for their own company'
      });
    }

    // force body.company to correct value if present
    if (req.body && req.body.company && req.body.company !== userCompany) {
      req.body.company = userCompany;
    }

    return next();
  }

  // ───── HR Officer ────────────────────────────────────────────────
  if (role === 'HROfficer') {
    if (!userCompany) {
      return res.status(400).json({ message: 'HROfficer has no company assigned' });
    }

    req.company = userCompany;

    if (requestedCompany && requestedCompany !== userCompany) {
      return res.status(403).json({
        message: 'HR officers can only access their own company'
      });
    }

    if (req.body && req.body.company && req.body.company !== userCompany) {
      req.body.company = userCompany;
    }

    return next();
  }

  // others not allowed
  return res.status(403).json({ message: 'Unauthorized role' });
};
