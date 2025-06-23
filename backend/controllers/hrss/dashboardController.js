const Employee = require('../../models/hrss/employee');
const Department = require('../../models/ta/Department');

// 🧠 Dashboard Summary for Employees
exports.getEmployeeDashboard = async (req, res) => {
  try {
    const employees = await Employee.find();
    const departments = await Department.find();

    const summary = {
      total: employees.length,
      active: employees.filter(e => e.status === 'Active').length,
      inactive: employees.filter(e => e.status !== 'Active').length,
      departments: departments.length
    };

    // Gender Breakdown: [Male, Female, Other]
    const genderCounts = ['Male', 'Female', 'Other'].map(gender =>
      employees.filter(e => e.gender === gender).length
    );

    // Monthly Join Stats
    const monthCounts = Array(12).fill(0);
    employees.forEach(e => {
      if (e.joinDate) {
        const month = new Date(e.joinDate).getMonth(); // 0-11
        monthCounts[month]++;
      }
    });

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    res.json({
      summary,
      genderCounts,
      months,
      monthCounts
    });

  } catch (err) {
    console.error('❌ Dashboard fetch error:', err);
    res.status(500).json({ message: 'Failed to load employee dashboard', error: err.message });
  }
};
