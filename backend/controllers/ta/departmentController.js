const Department = require('../../models/ta/Department');

// GET all departments (own company only unless GM)
exports.getAll = async (req, res) => {
  try {
    const filter = req.user.role === 'GeneralManager'
      ? {}
      : { companyId: req.user.companyId };

    const departments = await Department.find(filter).sort({ createdAt: -1 });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching departments', error: err.message });
  }
};

// GET one department by ID
exports.getOne = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    if (req.user.role !== 'GeneralManager' &&
        dept.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(dept);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching department', error: err.message });
  }
};

// CREATE department
exports.create = async (req, res) => {
  try {
    const { name, type, subType = 'General', jobTitles = [], recruiters = [] } = req.body;

    const newDept = new Department({
      companyId: req.user.companyId,
      name,
      type,
      subType,
      jobTitles,
      recruiters,
    });

    await newDept.save();
    res.status(201).json({ message: 'Department created', department: newDept });
  } catch (err) {
    res.status(500).json({ message: 'Error creating department', error: err.message });
  }
};

// UPDATE department
exports.update = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    if (req.user.role !== 'GeneralManager' &&
        dept.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, type, subType, jobTitles, recruiters } = req.body;

    if (name !== undefined) dept.name = name;
    if (type !== undefined) dept.type = type;
    if (subType !== undefined) dept.subType = subType;
    if (jobTitles !== undefined) dept.jobTitles = jobTitles;
    if (recruiters !== undefined) dept.recruiters = recruiters;

    await dept.save();
    res.json({ message: 'Department updated', department: dept });
  } catch (err) {
    res.status(500).json({ message: 'Error updating department', error: err.message });
  }
};

// DELETE department
exports.remove = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    if (req.user.role !== 'GeneralManager' &&
        dept.companyId.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await dept.remove();
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting department', error: err.message });
  }
};
