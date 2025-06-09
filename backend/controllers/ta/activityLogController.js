const ActivityLog = require('../../models/ta/ActivityLog');


// 🔍 GM Only: Get All Logs
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

    const logs = await ActivityLog.find({ company }).sort({ performedAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error('❌ Failed to fetch activity logs:', err);
    res.status(500).json({ message: 'Failed to fetch logs', error: err.message });
  }
};

exports.restoreDeleted = async (req, res) => {
  try {
    const { logId } = req.params;

    const log = await ActivityLog.findById(logId);
    if (!log) return res.status(404).json({ message: 'Log not found' });

    const { actionType, collectionName, previousData: oldData, documentId, company } = log;
  
    if (!['DELETE', 'UPDATE'].includes(actionType)) {
      return res.status(400).json({ message: 'Only DELETE or UPDATE actions can be restored' });
    }

    const Model = require(`../../models/ta/${collectionName}`);
    let restoredDoc = null;

    if (actionType === 'DELETE') {
      if (!oldData) return res.status(400).json({ message: 'No data to restore from DELETE' });
      restoredDoc = await Model.create(oldData);
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

    // 📘 Log the RESTORE action
    await ActivityLog.create({
      actionType: 'RESTORE',
      collectionName, // ✅ use correct field
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

