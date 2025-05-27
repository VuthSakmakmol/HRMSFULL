const Department = require('../../models/ta/Department');

// ✅ GET all departments with company, type, subType filters
exports.getAll = async (req, res) => {
  try {
    console.log('📥 GET /departments');
    console.log('🧾 req.user:', req.user);
    console.log('🧾 req.query:', req.query);

    const role = req.user?.role;
    const userCompany = req.user?.company;
    const queryCompany = req.query.company;

    let companyFilter;

    if (role === 'GeneralManager') {
      companyFilter = queryCompany;
    } else {
      companyFilter = userCompany;
    }

    if (!companyFilter) {
      console.error('⛔ Missing company filter');
      return res.status(400).json({ message: 'Company is required' });
    }

    const filter = {
      company: companyFilter.trim().toUpperCase()
    };

    // Optional filters
    if (req.query.type) filter.type = req.query.type;
    if (req.query.subType) filter.subType = req.query.subType;

    console.log('🔍 Department filter:', filter);

    const departments = await Department.find(filter);
    res.json(departments);
  } catch (err) {
    console.error('❌ Failed to fetch departments:', err);
    res.status(500).json({
      message: 'Failed to fetch departments',
      error: err.message
    });
  }
};

// ✅ GET department by ID with access control
exports.getById = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const role = req.user?.role;
    const userCompany = req.user?.company;

    if (role !== 'GeneralManager' && dept.company !== userCompany) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(dept);
  } catch (err) {
    console.error('❌ Failed to get department:', err);
    res.status(500).json({
      message: 'Failed to get department',
      error: err.message
    });
  }
};
