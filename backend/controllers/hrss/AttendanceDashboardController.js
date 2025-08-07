const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');
const moment = require('moment-timezone');

// 📌 Shared utility function
const buildAttendanceSummary = (attendances, empMap, excludeDepartment = null) => {
  const departmentStats = {};

  for (const att of attendances) {
    const department = empMap[att.employeeId] || 'Unknown';

    if (excludeDepartment && department === excludeDepartment) continue;

    if (!departmentStats[department]) {
      departmentStats[department] = {
        department,
        annualLeave: 0,
        maternityLeave: 0,
        sickLeave: 0,
        unpaidLeave: 0,
        absent: 0,
        employeeIds: new Set(),
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

  return departmentStats;
};

exports.getMonthlyDepartmentSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const company = req.company;

    if (!year || !month) {
      return res.status(400).json({ message: 'Missing year or month' });
    }

    const startDate = moment.tz({ year, month: month - 1 }, 'Asia/Phnom_Penh').startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();

    // Step 1: Get all employees (only Sewing)
    const employees = await Employee.find({ company, department: 'Sewing' }).select('employeeId department');
    const empMap = {};
    const sewingEmployeeIds = new Set();

    for (const emp of employees) {
      empMap[emp.employeeId] = 'Sewing';
      sewingEmployeeIds.add(emp.employeeId);
    }

    // Step 2: Get all attendances in range
    const attendances = await Attendance.find({
      company,
      date: { $gte: startDate, $lte: endDate },
      employeeId: { $in: Array.from(sewingEmployeeIds) }
    });

    // Step 3: Build stats and working days
    const stat = {
      department: 'Sewing',
      annualLeave: 0,
      maternityLeave: 0,
      sickLeave: 0,
      unpaidLeave: 0,
      absent: 0,
      employeeIds: new Set()
    };

    const workingDateSet = new Set(); // unique attendance days

    for (const att of attendances) {
      stat.employeeIds.add(att.employeeId);
      workingDateSet.add(att.date.toISOString().slice(0, 10)); // YYYY-MM-DD

      if (att.status === 'Leave') {
        const type = (att.leaveType || '').toLowerCase();
        if (type === 'annual leave') stat.annualLeave++;
        else if (type === 'maternity leave') stat.maternityLeave++;
        else if (type === 'sick leave') stat.sickLeave++;
        else if (type === 'unpaid leave') stat.unpaidLeave++;
      } else if (att.status === 'Absent') {
        stat.absent++;
      }
    }

    const numEmployees = stat.employeeIds.size;
    const workingDays = workingDateSet.size;
    const grandTotal = stat.annualLeave + stat.maternityLeave + stat.sickLeave + stat.unpaidLeave + stat.absent;
    const totalWorkSlots = numEmployees * workingDays;

    const percentAbsent = totalWorkSlots ? ((stat.absent / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%';
    const percentAL = totalWorkSlots ? ((stat.annualLeave / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%';
    const excludeAL = totalWorkSlots ? (((grandTotal - stat.annualLeave) / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%';

    const result = [
      {
        Department: 'Sewing',
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
      }
    ];

    res.json(result);
  } catch (err) {
    console.error('❌ Error in getMonthlyDepartmentSummary:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


exports.getIndirectAndMerchandisingSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const company = req.company;

    if (!year || !month) {
      return res.status(400).json({ message: 'Missing year or month' });
    }

    const startDate = moment.tz({ year, month: month - 1 }, 'Asia/Phnom_Penh').startOf('month').toDate();
    const endDate = moment(startDate).endOf('month').toDate();

    // Step 1: Get employees (exclude Sewing)
    const employees = await Employee.find({ company }).select('employeeId department');
    const empMap = {};
    const departmentEmployees = {}; // { department: Set(employeeIds) }

    for (const emp of employees) {
      const dept = emp.department || 'Unknown';
      if (dept === 'Sewing') continue;

      empMap[emp.employeeId] = dept;
      if (!departmentEmployees[dept]) departmentEmployees[dept] = new Set();
      departmentEmployees[dept].add(emp.employeeId);
    }

    // Step 2: Get all attendance records in date range
    const attendances = await Attendance.find({
      company,
      date: { $gte: startDate, $lte: endDate }
    });

    // Step 3: Organize attendance data
    const departmentStats = {};
    const departmentWorkDates = {}; // { department: Set of unique working dates }

    for (const att of attendances) {
      const dept = empMap[att.employeeId];
      if (!dept) continue;

      // Track leave/absent stats
      if (!departmentStats[dept]) {
        departmentStats[dept] = {
          annualLeave: 0,
          maternityLeave: 0,
          sickLeave: 0,
          unpaidLeave: 0,
          absent: 0,
        };
      }

      if (!departmentWorkDates[dept]) departmentWorkDates[dept] = new Set();
      departmentWorkDates[dept].add(att.date.toISOString().slice(0, 10)); // "YYYY-MM-DD"

      if (att.status === 'Leave') {
        const type = (att.leaveType || '').toLowerCase();
        if (type === 'annual leave') departmentStats[dept].annualLeave++;
        else if (type === 'maternity leave') departmentStats[dept].maternityLeave++;
        else if (type === 'sick leave') departmentStats[dept].sickLeave++;
        else if (type === 'unpaid leave') departmentStats[dept].unpaidLeave++;
      } else if (att.status === 'Absent') {
        departmentStats[dept].absent++;
      }
    }

    // Step 4: Build final result
    const result = [];

    for (const dept in departmentEmployees) {
      const employeeIds = departmentEmployees[dept];
      const numEmployees = employeeIds.size;
      const stat = departmentStats[dept] || {
        annualLeave: 0,
        maternityLeave: 0,
        sickLeave: 0,
        unpaidLeave: 0,
        absent: 0,
      };

      const workingDays = departmentWorkDates[dept]?.size || 0;
      const grandTotal = stat.annualLeave + stat.maternityLeave + stat.sickLeave + stat.unpaidLeave + stat.absent;
      const totalWorkSlots = numEmployees * workingDays;

      result.push({
        Department: dept,
        'Annual Leave': stat.annualLeave,
        'Maternity Leave': stat.maternityLeave,
        'Sick Leave': stat.sickLeave,
        'Unpaid Leave': stat.unpaidLeave,
        'Absent': stat.absent,
        'Grand Total': grandTotal,
        'Number of Employees': numEmployees,
        'Working day': workingDays,
        '%Absent': totalWorkSlots ? ((stat.absent / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%',
        '% AL': totalWorkSlots ? ((stat.annualLeave / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%',
        'Exclude AL': totalWorkSlots ? (((grandTotal - stat.annualLeave) / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%',
      });
    }

    res.json(result);
  } catch (err) {
    console.error('❌ Error in getIndirectAndMerchandisingSummary:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
