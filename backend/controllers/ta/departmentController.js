//backend/controllers/ta/departmentController.js
const Department = require('../../models/ta/Department');
const { logActivity } = require('../../utils/logActivity') // adjust if needed


// ✅ GET all departments with company, type, subType filters
// backend/controllers/ta/departmentController.js
exports.getAll = async (req, res) => {
  try {
    const companyFilter = req.company; // set by authorizeCompanyAccess

    if (!companyFilter) {
      return res.status(400).json({ message: 'Company is required' });
    }

    const filter = {
      company: companyFilter.trim().toUpperCase()
    };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.subType) filter.subType = req.query.subType;

    const departments = await Department.find(filter).sort({ departmentName: 1 });
    res.json(departments);
  } catch (err) {
    console.error('❌ Department Fetch Error:', err);
    res.status(500).json({ message: 'Failed to fetch departments', error: err.message });
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

// ✅ CREATE department
exports.create = async (req, res) => {
  try {
    const { name, type, subType, jobTitles = [], company } = req.body;

    if (!name || !type || !company) {
      return res.status(400).json({ message: 'Name, type, and company are required' });
    }

    const existing = await Department.findOne({ name, company });
    if (existing) {
      return res.status(409).json({ message: 'Department with this name already exists in the company' });
    }

    const department = new Department({
      name: name.trim(),
      type,
      subType: type === 'Blue Collar' ? subType : null,
      jobTitles,
      company: company.trim().toUpperCase()
    });

    await logActivity({
      actionType: 'CREATE',
      collectionName: 'Department',
      documentId: department._id,
      performedBy: req.user?.email || 'System',
      company: department.company,
      newData: department.toObject()
    })

    await department.save();
    res.status(201).json(department);
  } catch (err) {
    console.error('❌ Failed to create department:', err);
    res.status(500).json({ message: 'Failed to create department', error: err.message });
  }
};


// ✅ UPDATE department
exports.update = async (req, res) => {
  try {
    const { name, type, subType, jobTitles } = req.body;
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const previousData = dept.toObject(); // ✅ capture BEFORE changes

    // 🔄 Apply updates
    dept.name = name || dept.name;
    dept.type = type || dept.type;
    dept.subType = type === 'Blue Collar' ? subType : null;
    dept.jobTitles = jobTitles || dept.jobTitles;

    await dept.save(); // ✅ Save first

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'Department',
      documentId: dept._id,
      performedBy: req.user?.email || 'System',
      company: dept.company,
      previousData,
      newData: dept.toObject()
    });

    res.json(dept);
  } catch (err) {
    console.error('❌ Failed to update department:', err);
    res.status(500).json({ message: 'Failed to update department', error: err.message });
  }
};



// ✅ DELETE department
exports.remove = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const previousData = dept.toObject(); // ✅ capture before deletion
    await dept.deleteOne(); // ✅ delete safely

    await logActivity({
      actionType: 'DELETE',
      collectionName: 'Department',
      documentId: dept._id,
      performedBy: req.user?.email || 'System',
      company: dept.company,
      previousData,
      newData: null
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('❌ Failed to delete department:', err);
    res.status(500).json({ message: 'Failed to delete department', error: err.message });
  }
};


// ✅ REMOVE specific job titles
exports.removeJobTitles = async (req, res) => {
  try {
    const { titlesToRemove = [] } = req.body;

    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    dept.jobTitles = dept.jobTitles.filter(title => !titlesToRemove.includes(title));

    await logActivity({
      actionType: 'UPDATE',
      collectionName: 'Department',
      documentId: dept._id,
      performedBy: req.user?.email || 'System',
      company: dept.company,
      previousData,
      newData: dept.toObject(),
      note: `Removed job titles: ${titlesToRemove.join(', ')}`
    })

    await dept.save();
    res.json(dept);
  } catch (err) {
    console.error('❌ Failed to remove job titles:', err);
    res.status(500).json({ message: 'Failed to update department', error: err.message });
  }
};


