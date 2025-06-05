const Roadmap = require('../../models/ta/Roadmap');

// 🔧 GET all roadmaps (with optional filters)
exports.getRoadmaps = async (req, res) => {
  try {
    const company = req.query.company?.trim().toUpperCase();
    if (!company) return res.status(400).json({ message: 'Missing company in query' });

    const query = { company };

    if (req.query.year) query.year = parseInt(req.query.year);
    if (req.query.month) query.month = req.query.month;
    if (req.query.type) query.type = req.query.type;
    if (req.query.subType) query.subType = req.query.subType;

    const data = await Roadmap.find(query).sort({ year: 1, month: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching roadmaps', error: err.message });
  }
};

// 🟡 POST - Create roadmap
exports.createRoadmap = async (req, res) => {
  try {
    const company = req.body.company?.trim().toUpperCase();
    if (!company) return res.status(400).json({ message: 'Missing company in request' });

    const type = req.body.type;
    const subType = type === 'Blue Collar' ? req.body.subType || null : null;

    const newRoadmap = new Roadmap({
      ...req.body,
      type,
      subType,
      company
    });

    await newRoadmap.save();
    res.status(201).json(newRoadmap);
  } catch (err) {
    res.status(400).json({ message: 'Creation failed', error: err.message });
  }
};

// 🟠 PUT - Update roadmap
exports.updateRoadmap = async (req, res) => {
  try {
    const company = req.body.company?.trim().toUpperCase();
    if (!company) return res.status(400).json({ message: 'Missing company in request' });

    const type = req.body.type;
    const subType = type === 'Blue Collar' ? req.body.subType || null : null;

    const updated = await Roadmap.findOneAndUpdate(
      { _id: req.params.id, company },
      { ...req.body, type, subType, company },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Roadmap not found for this company' });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

// 🔴 DELETE - Delete roadmap
exports.deleteRoadmap = async (req, res) => {
  try {
    const company = req.query.company?.trim().toUpperCase();
    if (!company) return res.status(400).json({ message: 'Missing company in query' });

    const deleted = await Roadmap.findOneAndDelete({ _id: req.params.id, company });

    if (!deleted) return res.status(404).json({ message: 'Roadmap not found for this company' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Delete failed', error: err.message });
  }
};

// 📊 GET summary for dashboard
exports.getSummary = async (req, res) => {
  try {
    const company = req.query.company?.trim().toUpperCase();
    if (!company) return res.status(400).json({ message: 'Missing company in query' });

    const summary = await Roadmap.aggregate([
      { $match: { company } },
      {
        $group: {
          _id: {
            year: "$year",
            month: "$month",
            type: "$type",
            subType: "$subType"
          },
          roadmapHC: { $sum: "$roadmapHC" },
          actualHC: { $sum: "$actualHC" },
          hiringTargetHC: { $sum: "$hiringTargetHC" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Summary generation failed', error: err.message });
  }
};
