const Employee = require('../../models/hrss/employee');
const { logActivity } = require('../../utils/logActivity');


// Create new employee (Step 1)
exports.createEmployee = async (req, res) => {
  try {
    console.log('[Creating Employee]', req.body) // log incoming data
    const newEmp = await Employee.create(req.body)
    res.status(201).json(newEmp)
  } catch (err) {
    console.error('[CREATE ERROR]', err)
    res.status(500).json({ error: err.message })
  }
}


// Get all employees
exports.getAllEmployees = async (req, res) => {
  try {
    const { company } = req.query
    if (!company) return res.status(400).json({ message: 'Company is required' })

    const employees = await Employee.find({ company }).sort({ createdAt: -1 })
    res.json(employees)
  } catch (err) {
    console.error('❌ Failed to get employees:', err)
    res.status(500).json({ message: 'Failed to get employees', error: err.message })
  }
}


// Get single employee by ID (for resume/edit)
exports.getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
    if (!employee) return res.status(404).json({ error: 'Employee not found' })
    res.json(employee)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employee' })
  }
}

// Update employee (step-by-step or full)
exports.updateEmployee = async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee', details: err })
  }
}

// Delete single employee
exports.deleteEmployee = async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id)
    res.json({ message: 'Employee deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee' })
  }
}

// Delete multiple employees
exports.deleteMultipleEmployees = async (req, res) => {
  try {
    const { ids } = req.body
    await Employee.deleteMany({ _id: { $in: ids } })
    res.json({ message: 'Selected employees deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete multiple employees' })
  }
}
