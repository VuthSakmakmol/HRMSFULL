const Department = require('../../models/ta/Department');

// ✅ GET all departments with company, type, subType filters
exports.getAll = async (req, res) => {
  try {
    const filter = {};

    // Determine company based on role
    const currentCompany = req.user.role === 'GeneralManager'
      ? req.query.company
      : req.user.company;

    if (!currentCompany) {
      return res.status(400).json({ message: 'Company is required' });
    }

    // Assign company to filter
    filter.company = currentCompany.trim().toUpperCase(); // <- Correct placement

    // Optional filters
    if (req.query.type) filter.type = req.query.type;
    if (req.query.subType) filter.subType = req.query.subType;

    console.log('🔍 Filter used:', filter);

    const departments = await Department.find(filter);
    res.json(departments);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch departments',
      error: err.message
    });
  }
};

// ✅ GET department by ID
exports.getById = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    if (req.user.role !== 'GeneralManager' && dept.company !== req.user.company) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(dept);
  } catch (err) {
    res.status(500).json({
      message: 'Failed to get department',
      error: err.message
    });
  }
};
