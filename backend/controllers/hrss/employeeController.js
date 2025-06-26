const Employee = require('../../models/hrss/employee');
const EmployeeImportError = require('../../models/hrss/employeeImportError');
const { logActivity } = require('../../utils/logActivity');

// ────────────────────────────────────────────────────────────────────────────────
// Utility to check and clean invalid dates
function isValidDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// ────────────────────────────────────────────────────────────────────────────────
// Preview Excel Import: Identify duplicates vs new
exports.previewImport = async (req, res) => {
  try {
    const data = req.body;
    const company = req.user.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: 'No data received' });
    }

    const incomingIds = data.map(d => d.employeeId?.trim()).filter(Boolean);
    const existingIds = await Employee.find({ company, employeeId: { $in: incomingIds } }).distinct('employeeId');

    const duplicates = [];
    const toImport = [];

    for (const row of data) {
      const id = row.employeeId?.trim();
      if (!id) continue;
      if (existingIds.includes(id)) {
        duplicates.push(row);
      } else {
        toImport.push(row);
      }
    }

    console.log('📦 Preview:', {
      incoming: data.length,
      toImport: toImport.length,
      duplicates: duplicates.length
    });

    res.json({ toImport, duplicates });
  } catch (err) {
    console.error('❌ Preview Import Error:', err);
    res.status(500).json({ message: 'Preview failed', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Confirm Final Import: Validate, clean, and insert
exports.confirmImport = async (req, res) => {
  try {
    const { toImport } = req.body;
    const company = req.user.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });
    if (!Array.isArray(toImport) || toImport.length === 0) {
      return res.status(400).json({ message: 'No data to import' });
    }

    const inserted = [];
    const failed = [];

    for (const item of toImport) {
      try {
        // Clean invalid date fields
        const keysToCheck = [
          'idCardExpireDate',
          'passportExpireDate',
          'visaExpireDate',
          'medicalCheckDate',
          'joinDate',
        ];

        keysToCheck.forEach(key => {
          if (item[key] && !isValidDate(item[key])) {
            console.warn(`⚠️ Invalid date cleared for ${key}: ${item[key]}`);
            item[key] = null;
          }
        });

        const emp = new Employee({
          ...item,
          company, // ✅ override with secure value
        });

        await emp.validate();
        await emp.save();
        inserted.push(emp);
      } catch (err) {
        console.error('❌ Validation/Save Error:', err.message);
        failed.push({ item, reason: err.message });
      }
    }

    res.status(200).json({
      message: `Imported ${inserted.length} employees.`,
      failedCount: failed.length,
      failed
    });
  } catch (err) {
    console.error('❌ Confirm Import Error:', err);
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Create new employee
exports.createEmployee = async (req, res) => {
  try {
    const company = req.user.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const newEmp = new Employee({
      ...req.body,
      company // ✅ enforce trusted value
    });

    await newEmp.save();
    res.status(201).json(newEmp);
  } catch (err) {
    console.error('[CREATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Get employees by company with pagination
// Get employees by company with pagination
exports.getAllEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const company = req.user.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const query = { company };

    let employees;
    let total;

    total = await Employee.countDocuments(query);

    if (limit === 'all') {
      employees = await Employee.find(query).sort({ createdAt: -1 });
    } else {
      const pageInt = parseInt(page);
      const limitInt = Math.max(parseInt(limit), 1);
      const skip = (pageInt - 1) * limitInt;

      employees = await Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitInt);
    }

    res.json({
      employees,
      total,
      currentPage: page === 'all' ? 1 : parseInt(page),
      totalPages: limit === 'all' ? 1 : Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get employees', error: err.message });
  }
};


// ────────────────────────────────────────────────────────────────────────────────
// Get single employee by ID
exports.getEmployeeById = async (req, res) => {
  try {
    const company = req.user.company;
    const employee = await Employee.findOne({ _id: req.params.id, company });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Update employee
exports.updateEmployee = async (req, res) => {
  try {
    const company = req.user.company;
    const updated = await Employee.findOneAndUpdate(
      { _id: req.params.id, company },
      { $set: req.body },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Employee not found or unauthorized' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee', details: err });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Delete employee
exports.deleteEmployee = async (req, res) => {
  try {
    const company = req.user.company;
    const deleted = await Employee.findOneAndDelete({ _id: req.params.id, company });

    if (!deleted) return res.status(404).json({ message: 'Employee not found or unauthorized' });
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// Delete multiple employees
exports.deleteMultipleEmployees = async (req, res) => {
  try {
    const company = req.user.company;
    const { ids } = req.body;

    const result = await Employee.deleteMany({ _id: { $in: ids }, company });
    res.json({ message: 'Selected employees deleted', deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete multiple employees' });
  }
};
