const Roadmap = require('../../models/ta/Roadmap');

// 🟢 GET all roadmaps (with optional filters: year, month, type, subtype)
exports.getRoadmaps = async (req, res) => {
  try {
    const query = {};

    if (req.query.year) query.year = parseInt(req.query.year);
    if (req.query.month) query.month = req.query.month;

    if (req.query.type) {
      const { type, subType } = parseType(req.query.type);
      query.type = type;
      if (subType) query.subType = subType;
    }

    const data = await Roadmap.find(query).sort({ year: 1, month: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching roadmaps', error: err.message });
  }
};

// 🟡 POST - Create a roadmap entry
exports.createRoadmap = async (req, res) => {
  try {
    const { type, subType } = parseType(req.body.type);

    const newEntry = new Roadmap({
      ...req.body,
      type,
      subType
    });

    await newEntry.save();
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(400).json({ message: 'Creation failed', error: err.message });
  }
};

// 🟠 PUT - Update a roadmap entry
exports.updateRoadmap = async (req, res) => {
  try {
    const { type, subType } = parseType(req.body.type);

    const updated = await Roadmap.findByIdAndUpdate(
      req.params.id,
      { ...req.body, type, subType },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Roadmap not found' });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

// 🔴 DELETE - Remove a roadmap entry
exports.deleteRoadmap = async (req, res) => {
  try {
    const deleted = await Roadmap.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ message: 'Roadmap not found' });

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Delete failed', error: err.message });
  }
};

// 📊 GET summary for dashboard charts (optional)
exports.getSummary = async (req, res) => {
  try {
    const summary = await Roadmap.aggregate([
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

// 🧠 Helper - Convert string type into type + subType
function parseType(typeString) {
  if (typeString === 'White Collar') return { type: 'White Collar', subType: null };
  if (typeString === 'Blue Collar - Sewer') return { type: 'Blue Collar', subType: 'Sewer' };
  if (typeString === 'Blue Collar - Non-Sewer') return { type: 'Blue Collar', subType: 'Non-Sewer' };
  return { type: typeString, subType: null };
}
