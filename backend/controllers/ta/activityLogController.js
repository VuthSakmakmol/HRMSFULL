const ActivityLog = require('../../models/ta/ActivityLog');

// 🔍 GET all logs for selected company (GM only)
exports.getAllLogs = async (req, res) => {
  try {
    const user = req.user;
    const company = req.query.company;

    if (user.role !== 'GeneralManager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!company) {
      return res.status(400).json({ message: 'Company query parameter is required' });
    }

    const logs = await ActivityLog.find({ company })
      .sort({ performedAt: -1 });

    res.json(logs);
  } catch (err) {
    console.error('❌ Failed to fetch activity logs:', err);
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
};

// ♻️ POST restore data from DELETE or UPDATE logs
exports.restoreDeleted = async (req, res) => {
  try {
    const { logId } = req.params;
    const { collectionName, previousData, company } = req.body;

    const log = await ActivityLog.findById(logId);
    if (!log) {
      return res.status(404).json({ message: 'Log not found' });
    }

    if (!['DELETE', 'UPDATE'].includes(log.actionType)) {
      return res.status(400).json({ message: 'Only DELETE and UPDATE actions are restorable' });
    }

    const Model = require(`../../models/ta/${collectionName}`);
    let restoredDoc;

    if (log.actionType === 'DELETE') {
      // ➕ Recreate deleted document
      restoredDoc = await Model.create(previousData);
    } else if (log.actionType === 'UPDATE') {
      // 🔁 Revert document to previousData using ID
      if (!log.documentId) {
        return res.status(400).json({ message: 'Missing documentId for update restore' });
      }

      restoredDoc = await Model.findByIdAndUpdate(log.documentId, previousData, { new: true });
      if (!restoredDoc) {
        return res.status(404).json({ message: 'Document not found for update restoration' });
      }
    }

    // 📝 Log the restore
    await ActivityLog.create({
      actionType: 'RESTORE',
      collectionName: collectionName,
      documentId: restoredDoc._id,
      previousData,
      performedBy: req.user.email,
      company,
      performedAt: new Date()
    });

    res.json({ message: `Restored from ${log.actionType} successfully.` });
  } catch (err) {
    console.error('❌ Restore error:', err);
    res.status(500).json({ message: 'Restore failed', error: err.message });
  }
};
