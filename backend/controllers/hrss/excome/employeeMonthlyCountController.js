const Employee = require('../../../models/hrss/employee');
const EmployeeMonthlySnapshot = require('../../../models/hrss/excome/EmployeeMonthlySnapshot');
const moment = require('moment-timezone');

// Helper to classify employee types
function classifyPosition(employee) {
  if (['Sewer', 'Jumper'].includes(employee.position)) return 'directLabor';
  if (employee.department === 'Merchandising') return 'marketing';
  return 'indirectLabor';
}

// Save monthly snapshot for given company, year, and month
exports.saveMonthlySnapshot = async (req, res) => {
  try {
    const { company } = req;
    const year = parseInt(req.body.year);
    const month = parseInt(req.body.month); // 0-based

    if (!company || isNaN(year) || isNaN(month)) {
      return res.status(400).json({ message: 'Missing or invalid company/year/month' });
    }

    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const employees = await Employee.find({
      company,
      status: 'Working',
      joinDate: { $lte: endOfMonth }
    });

    const counts = { directLabor: 0, marketing: 0, indirectLabor: 0 };

    employees.forEach(emp => {
      const type = classifyPosition(emp);
      counts[type]++;
    });

    const update = {
      ...counts,
      updatedAt: new Date()
    };

    const snapshot = await EmployeeMonthlySnapshot.findOneAndUpdate(
      { company, year, month },
      { $set: update },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Snapshot saved successfully',
      snapshot
    });

  } catch (err) {
    console.error('[Snapshot Error]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get monthly snapshots for a year (future months = 0)
exports.getEmployeeMonthlySnapshots = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    if (!year) return res.status(400).json({ message: 'Year is required' });

    const monthlyData = [];
    const now = moment().tz('Asia/Phnom_Penh');
    const currentMonth = now.month();
    const currentYear = now.year();

    for (let month = 0; month < 12; month++) {
      const isFuture = year > currentYear || (year === currentYear && month > currentMonth);

      if (isFuture) {
        monthlyData.push({
          month,
          directLabor: 0,
          marketing: 0,
          indirectLabor: 0
        });
        continue;
      }

      const endOfMonth = moment.tz({ year, month }, 'Asia/Phnom_Penh').endOf('month').toDate();

      const employees = await Employee.find({
        joinDate: { $lte: endOfMonth },
        status: 'Working'
      });

      const counts = {
        directLabor: 0,
        marketing: 0,
        indirectLabor: 0
      };

      employees.forEach(emp => {
        const type = classifyPosition(emp);
        counts[type]++;
      });

      monthlyData.push({
        month,
        ...counts
      });
    }

    res.json({ snapshots: monthlyData });

  } catch (err) {
    console.error('Error in getEmployeeMonthlySnapshots:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
