const ActivityLog = require('../../models/ta/ActivityLog');
const registry = require('../../utils/modelRegistry');

// GET /api/ta/activity-logs?company=...&page=&limit=
exports.getAllLogs = async (req, res) => {
  try {
    const { role, companies } = req.user;
    const company = req.headers['x-company-override'] || req.query.company;

    if (role !== 'GeneralManager') {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!company) {
      return res.status(400).json({ message: 'Company query parameter is required' });
    }
    if (Array.isArray(companies) && !companies.includes(company)) {
      return res.status(403).json({ message: 'GM not authorized for this company' });
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ActivityLog.find({ company }).sort({ performedAt: -1 }).skip(skip).limit(limit),
      ActivityLog.countDocuments({ company })
    ]);

    res.json({
      page,
      limit,
      total,
      items
    });
  } catch (err) {
    console.error('❌ Failed to fetch activity logs:', err);
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
};

// POST /api/ta/activity-logs/restore/:logId
exports.restoreDeleted = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await ActivityLog.findById(logId);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    const { actionType, collectionName, previousData: oldData, documentId, company } = log;

    if (!['DELETE', 'UPDATE'].includes(actionType)) {
      return res.status(400).json({ message: 'Only DELETE or UPDATE actions can be restored' });
    }

    const Model = registry[collectionName];
    if (!Model) return res.status(400).json({ message: `Unknown or disallowed collectionName: ${collectionName}` });

    let restoredDoc = null;

    if (actionType === 'DELETE') {
      if (!oldData) return res.status(400).json({ message: 'No data to restore from DELETE' });
      const { _id, ...payload } = oldData; // avoid _id duplicate
      try {
        restoredDoc = await Model.create(payload);
      } catch (e) {
        if (e.code === 11000) {
          return res.status(409).json({ message: 'Restore conflict (duplicate key)', error: e.message });
        }
        throw e;
      }
    }

    if (actionType === 'UPDATE') {
      if (!documentId || !oldData) {
        return res.status(400).json({ message: 'Missing documentId or oldData for update restore' });
      }
      restoredDoc = await Model.findByIdAndUpdate(documentId, oldData, { new: true });
      if (!restoredDoc) {
        return res.status(404).json({ message: 'Original document not found for restoration' });
      }
    }

    await ActivityLog.create({
      actionType: 'RESTORE',
      collectionName,
      documentId: restoredDoc._id,
      previousData: log.newData || null,
      newData: restoredDoc.toObject(),
      performedBy: req.user.email,
      company,
      performedAt: new Date()
    });

    res.json({ message: `Restored from ${actionType} successfully.`, restoredDoc });
  } catch (err) {
    console.error('❌ Restore failed:', err);
    res.status(500).json({ message: 'Restore error', error: err.message });
  }
};
