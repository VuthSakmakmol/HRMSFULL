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
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: 'No data received' });
    }

    const incomingIds = data.map(d => d.employeeId?.trim()).filter(Boolean);
    const existingIds = await Employee.find({ employeeId: { $in: incomingIds } }).distinct('employeeId');

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

        const emp = new Employee(item);
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
// Basic CRUD remains the same
exports.createEmployee = async (req, res) => {
  try {
    const newEmp = await Employee.create(req.body);
    res.status(201).json(newEmp);
  } catch (err) {
    console.error('[CREATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const { company, page = 1, limit = 10 } = req.query;
    if (!company) return res.status(400).json({ message: 'Company is required' });

    const pageInt = parseInt(page);
    const limitInt = Math.max(parseInt(limit), 1);
    const skip = (pageInt - 1) * limitInt;

    const query = { company };

    const [employees, total] = await Promise.all([
      Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitInt),
      Employee.countDocuments(query),
    ]);

    res.json({
      employees,
      total,
      currentPage: pageInt,
      totalPages: Math.ceil(total / limitInt),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get employees', error: err.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee', details: err });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

exports.deleteMultipleEmployees = async (req, res) => {
  try {
    const { ids } = req.body;
    await Employee.deleteMany({ _id: { $in: ids } });
    res.json({ message: 'Selected employees deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete multiple employees' });
  }
};
