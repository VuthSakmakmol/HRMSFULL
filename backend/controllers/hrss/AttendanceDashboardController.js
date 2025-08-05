// controllers/hrss/AttendanceDashboardController.js

const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');
const moment = require('moment-timezone');

exports.getMonthlyDepartmentSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const company = req.company;

    if (!year || !month) {
      return res.status(400).json({ message: 'Missing year or month' });
    }

    const startDate = moment.tz({ year, month: month - 1, day: 1 }, 'Asia/Phnom_Penh').startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();
    const workingDays = 22; // Optional: you can also make this dynamic

    // Step 1: Get all employees in the company
    const employees = await Employee.find({ company }).select('employeeId department');
    const empMap = {};
    employees.forEach(emp => {
      empMap[emp.employeeId] = emp.department || 'Unknown';
    });

    // Step 2: Get all attendances in that month
    const attendances = await Attendance.find({
      company,
      date: { $gte: startDate, $lte: endDate }
    });

    const departmentStats = {};

    for (const att of attendances) {
      const department = empMap[att.employeeId] || 'Unknown';
      if (!departmentStats[department]) {
        departmentStats[department] = {
          department,
          annualLeave: 0,
          maternityLeave: 0,
          sickLeave: 0,
          unpaidLeave: 0,
          absent: 0,
          employeeIds: new Set()
        };
      }

      departmentStats[department].employeeIds.add(att.employeeId);

      if (att.status === 'Leave') {
        const leaveType = (att.leaveType || '').toLowerCase();
        if (leaveType === 'annual leave') departmentStats[department].annualLeave++;
        else if (leaveType === 'maternity leave') departmentStats[department].maternityLeave++;
        else if (leaveType === 'sick leave') departmentStats[department].sickLeave++;
        else if (leaveType === 'unpaid leave') departmentStats[department].unpaidLeave++;
      } else if (att.status === 'Absent') {
        departmentStats[department].absent++;
      }
    }

    const result = Object.values(departmentStats).map(stat => {
      const numEmployees = stat.employeeIds.size;
      const grandTotal = stat.annualLeave + stat.maternityLeave + stat.sickLeave + stat.unpaidLeave + stat.absent;

      const totalWorkSlots = numEmployees * workingDays;

      const percentAbsent = totalWorkSlots ? ((stat.absent / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%';
      const percentAL = totalWorkSlots ? ((stat.annualLeave / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%';
      const excludeAL = totalWorkSlots ? (((grandTotal - stat.annualLeave) / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%';

      return {
        Department: stat.department,
        'Annual Leave': stat.annualLeave,
        'Maternity Leave': stat.maternityLeave,
        'Sick Leave': stat.sickLeave,
        'Unpaid Leave': stat.unpaidLeave,
        'Absent': stat.absent,
        'Grand Total': grandTotal,
        'Number of Employees': numEmployees,
        'Working day': workingDays,
        '%Absent': percentAbsent,
        '% AL': percentAL,
        'Exclude AL': excludeAL
      };
    });

    res.json(result);
  } catch (err) {
    console.error('❌ Error in getMonthlyDepartmentSummary:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
