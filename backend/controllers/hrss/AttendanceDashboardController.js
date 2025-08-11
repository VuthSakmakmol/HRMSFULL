const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');
const moment = require('moment-timezone');
const AttendanceTarget = require('../../models/hrss/AttendanceTarget');
const TurnoverTarget = require('../../models/hrss/turnoverTarget');

const isDirectLabor = emp => ['Sewer', 'Jumper'].includes(emp.position)

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


// GET Sewing(Blue) monthly department summary
exports.getMonthlyDepartmentSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    const company = req.company;

    if (!year || !month) {
      return res.status(400).json({ message: 'Missing year or month' });
    }

    const startDate = moment.tz({ year: +year, month: +month - 1 }, 'Asia/Phnom_Penh').startOf('month').toDate();
    const endDate   = moment.tz({ year: +year, month: +month - 1 }, 'Asia/Phnom_Penh').endOf('month').toDate();

    // 1) Fetch employees in Sewing(Blue) and take headcount from Employee collection
    const sewingEmployees = await Employee.find({
      company,
      department: 'Sewing(Blue)',
      status: 'Working', // <- adjust if you want to include non-working
    }).select('employeeId');

    const sewingIds = sewingEmployees.map(e => e.employeeId);
    const headcount = sewingEmployees.length; // <- always shown even without attendance

    // 2) Fetch attendance only for those employees in the month
    const attendances = await Attendance.find({
      company,
      employeeId: { $in: sewingIds.length ? sewingIds : ['__none__'] }, // safe fallback
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // 3) Aggregate leave/absent + working days from attendance when present
    const stat = {
      annualLeave: 0,
      maternityLeave: 0,
      sickLeave: 0,
      unpaidLeave: 0,
      absent: 0,
    };
    const workingDateSet = new Set(); // unique YYYY-MM-DD

    for (const att of attendances) {
      workingDateSet.add(att.date.toISOString().slice(0, 10));
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

    const workingDays = workingDateSet.size; // 0 if no attendance imported
    const grandTotal =
      stat.annualLeave + stat.maternityLeave + stat.sickLeave + stat.unpaidLeave + stat.absent;

    // 4) Denominator is headcount * workingDays
    const totalWorkSlots = headcount * workingDays;
    const pct = (n) => (totalWorkSlots ? ((n / totalWorkSlots) * 100).toFixed(2) + '%' : '0.00%');

    const result = [
      {
        Department: 'Sewing(Blue)',
        'Annual Leave': stat.annualLeave,
        'Maternity Leave': stat.maternityLeave,
        'Sick Leave': stat.sickLeave,
        'Unpaid Leave': stat.unpaidLeave,
        'Absent': stat.absent,
        'Grand Total': grandTotal,
        'Number of Employees': headcount, // <- always > 0 if employees exist
        'Working day': workingDays,
        '%Absent': pct(stat.absent),
        '% AL': pct(stat.annualLeave),
        'Exclude AL': pct(grandTotal - stat.annualLeave),
      },
    ];

    res.json(result);
  } catch (err) {
    console.error('❌ Error in getMonthlyDepartmentSummary:', err);
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
      if (dept === 'Sewing(Blue)') continue; // exclude Sewing(Blue) from indirect summary


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


// ─────────────────────────────────────────────────────────────────────────────
// 🎯 Compare Monthly Direct Labor Absent Rate (Last Year vs This Year)
exports.getMonthlyDirectAbsentRateCompare = async (req, res) => {
  try {
    const { company } = req;
    const year = parseInt(req.query.year);

    if (!year || isNaN(year)) {
      return res.status(400).json({ message: 'Invalid year' });
    }

    // Step 1: Get all direct labor employees
    const directLaborEmployees = await Employee.find({ company }).lean();
    const directLaborIds = directLaborEmployees
      .filter(isDirectLabor)
      .map((e) => e.employeeId);

    // Step 2: Define a helper to calculate absent rate and count per month
    const getMonthlyStats = async (targetYear) => {
      const result = [];

      for (let month = 0; month < 12; month++) {
        const start = moment.tz({ year: targetYear, month }, 'Asia/Phnom_Penh').startOf('month').toDate();
        const end = moment.tz({ year: targetYear, month }, 'Asia/Phnom_Penh').endOf('month').toDate();

        const attendances = await Attendance.find({
          company,
          employeeId: { $in: directLaborIds },
          date: { $gte: start, $lte: end }
        });

        // Get unique employeeId per month (total direct labor)
        const totalDirectLaborThisMonth = new Set(
          attendances.map((r) => r.employeeId)
        ).size;

        const absentCount = attendances.filter((a) => a.status === 'Absent').length;

        const rate = totalDirectLaborThisMonth > 0
          ? Math.round((absentCount / totalDirectLaborThisMonth) * 1000) / 10
          : 0;

        result.push({
          month: moment().month(month).format('MMM'),
          absentCount,
          rate
        });
      }

      return result;
    };

    // Step 3: Get data for this year and last year
    const lastYearData = await getMonthlyStats(year - 1);
    const thisYearData = await getMonthlyStats(year);

    // Step 4: Merge data into final format
    const combined = Array.from({ length: 12 }, (_, i) => ({
      month: lastYearData[i].month,
      lastYearAbsentRate: lastYearData[i].rate,
      lastYearAbsentCount: lastYearData[i].absentCount,
      thisYearAbsentRate: thisYearData[i].rate,
      thisYearAbsentCount: thisYearData[i].absentCount
    }));

    // Step 5: Get target
    const target = await AttendanceTarget.findOne({
      company,
      year,
      type: 'AbsentRate'
    });

    res.json({
      target: target?.value ?? 0,
      data: combined
    });
  } catch (err) {
    console.error('❌ Error in getMonthlyDirectAbsentRateCompare:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// 🎯 Update Attendance Target
exports.updateTarget = async (req, res) => {
  try {
    const { company } = req
    const { year, type, value } = req.body

    if (!year || !type || value === undefined) {
      return res.status(400).json({ message: 'Missing parameters' })
    }

    const updated = await AttendanceTarget.findOneAndUpdate(
      { company, year, type },
      { value },
      { upsert: true, new: true }
    )

    res.json({ message: 'Target updated', target: updated })
  } catch (err) {
    console.error('Error updating target:', err)
    res.status(500).json({ message: 'Failed to update target' })
  }
}

// (Optional) 🎯 Get Current Target Only
exports.getTarget = async (req, res) => {
  try {
    const { company } = req
    const { year = 2025, type = 'AbsentRate' } = req.query

    const target = await AttendanceTarget.findOne({ company, year, type })

    res.json({
      year,
      type,
      value: target?.value ?? 0
    })
  } catch (err) {
    console.error('Error in getTarget:', err)
    res.status(500).json({ message: 'Server error' })
  }
}

// 📊 GET Direct Labor Monthly Turnover Rate
exports.getMonthlyDirectLaborTurnoverRate = async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    const company = req.company;

    if (!year || !company) {
      return res.status(400).json({ message: 'Year and company required' });
    }

    const monthsData = [];

    for (let month = 0; month < 12; month++) {
      const startThisYear = moment.tz({ year, month, day: 1 }, 'Asia/Phnom_Penh').startOf('month');
      const endThisYear = startThisYear.clone().endOf('month');

      const startLastYear = startThisYear.clone().subtract(1, 'year');
      const endLastYear = endThisYear.clone().subtract(1, 'year');

      const filterPositions = { position: { $in: ['Sewer', 'Jumper'] } };

      // Helper to count
      const countInRange = (dateField, start, end) =>
        Employee.countDocuments({
          company,
          [dateField]: { $gte: start.toDate(), $lte: end.toDate() },
          ...filterPositions
        });

      const thisYearJoined = await countInRange('joinDate', startThisYear, endThisYear);
      const thisYearExits = await countInRange('resignDate', startThisYear, endThisYear);

      const lastYearJoined = await countInRange('joinDate', startLastYear, endLastYear);
      const lastYearExits = await countInRange('resignDate', startLastYear, endLastYear);

      const thisYearRate = thisYearJoined > 0 ? (thisYearExits / thisYearJoined) * 100 : 0;
      const lastYearRate = lastYearJoined > 0 ? (lastYearExits / lastYearJoined) * 100 : 0;

      monthsData.push({
        month: startThisYear.format('MMM'),
        thisYearJoined,
        thisYearExits,
        thisYearRate: +thisYearRate.toFixed(2),
        lastYearJoined,
        lastYearExits,
        lastYearRate: +lastYearRate.toFixed(2)
      });
    }

    const targetDoc = await TurnoverTarget.findOne({ company, year, type: 'TurnoverRate' });

    res.json({
      target: targetDoc?.value || 0,
      data: monthsData
    });
  } catch (err) {
    console.error('Error in getMonthlyDirectLaborTurnoverRate:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



// 🎯 GET target for year/type
exports.getTurnoverTarget = async (req, res) => {
  try {
    const { company } = req
    const { year, type } = req.query

    if (!company || !year || !type) {
      return res.status(400).json({ message: 'Missing parameters' })
    }

    const target = await TurnoverTarget.findOne({ company, year, type })
    res.json({
      year,
      type,
      value: target?.value ?? 0
    })
  } catch (err) {
    console.error('❌ getTurnoverTarget error:', err.message)
    res.status(500).json({ message: 'Failed to fetch target', error: err.message })
  }
}

// 🎯 UPDATE or CREATE target
exports.updateTurnoverTarget = async (req, res) => {
  try {
    const { company } = req
    const { year, type, value } = req.body

    if (!company || !year || !type || value === undefined) {
      return res.status(400).json({ message: 'Missing body data' })
    }

    const updated = await TurnoverTarget.findOneAndUpdate(
      { company, year, type },
      { value },
      { upsert: true, new: true }
    )

    res.json({ message: '✅ Target updated', target: updated })
  } catch (err) {
    console.error('❌ updateTurnoverTarget error:', err.message)
    res.status(500).json({ message: 'Failed to update target', error: err.message })
  }
}