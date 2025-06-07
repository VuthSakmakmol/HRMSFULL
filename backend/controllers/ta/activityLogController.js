const ActivityLog = require('../../models/ta/ActivityLog');

exports.getLogs = async (req, res) => {
  if (req.user.role !== 'GeneralManager') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const logs = await ActivityLog.find({ company: req.user.company }).sort({ performedAt: -1 });
  res.json(logs);
};


exports.getAllLogs = async (req, res) => {
  try {
    if (req.user.role !== 'GeneralManager') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const company = req.query.company;
    if (!company) {
      return res.status(400).json({ message: 'Company is required in query' });
    }

    const logs = await ActivityLog.find({ company }).sort({ performedAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error('❌ Failed to fetch logs:', err);
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
};

exports.restoreDeleted = async (req, res) => {
  if (req.user.role !== 'GeneralManager') {
    return res.status(403).json({ message: 'Access denied' });
  }

  const log = await ActivityLog.findById(req.params.logId);
  if (!log || log.actionType !== 'DELETE') {
    return res.status(404).json({ message: 'Restorable log not found' });
  }

  const modelPath = `../../models/ta/${log.collectionName}`;
  try {
    const Model = require(modelPath);
    const restored = await Model.create(log.previousData);

    // Record restore
    await ActivityLog.create({
      actionType: 'RESTORE',
      collectionName: log.collectionName,
      documentId: restored._id,
      newData: log.previousData,
      performedBy: req.user.email,
      company: req.user.company
    });

    res.json({ message: 'Record restored successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Restore failed', error: err.message });
  }
};
