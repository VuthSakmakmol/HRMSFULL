/* eslint-disable no-console */
const dayjs = require('dayjs');
const mongoose = require('mongoose');
const Attendance = require('../../models/hrss/attendances');
require('../../models/ta/department');

const TZ = process.env.TZ || 'Asia/Phnom_Penh';

exports.getDailyAttendanceReport = async (req, res) => {
  try {
    const company = req.company;
    const y = Number(req.query.year);
    const m = Number(req.query.month);

    if (!company || !y || !m)
      return res.status(400).json({ message: 'Missing company/year/month' });

    const start = dayjs.tz(`${y}-${String(m).padStart(2, '0')}-01`, TZ).startOf('month').toDate();
    const end = dayjs(start).add(1, 'month').toDate();
    const daysInMonth = dayjs(start).daysInMonth();

    // 1️⃣ Load all departments
    const Department = mongoose.models.Department || mongoose.model('Department');
    const departments = await Department.find({ company, active: { $ne: false } })
      .select('name')
      .lean();
    const departmentNames = departments.map(d => d.name).filter(Boolean).sort();

    // 2️⃣ Load attendance
    const records = await Attendance.aggregate([
      { $match: { company, date: { $gte: start, $lt: end } } },
      {
        $project: {
          date: 1,
          department: 1,
          status: 1,
        },
      },
      {
        $group: {
          _id: {
            department: '$department',
            day: { $dayOfMonth: '$date' },
          },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'OnTime'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
          maternity: { $sum: { $cond: [{ $eq: ['$status', 'Maternity Leave'] }, 1, 0] } },
          annual: { $sum: { $cond: [{ $eq: ['$status', 'Annual Leave'] }, 1, 0] } },
          unpaid: { $sum: { $cond: [{ $eq: ['$status', 'Unpaid Leave'] }, 1, 0] } },
          sick: { $sum: { $cond: [{ $eq: ['$status', 'Sick Leave'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.department': 1, '_id.day': 1 } },
    ]);

    // 3️⃣ Build maps
    const daySummary = {}; // for totals
    const depMap = {};

    for (const rec of records) {
      const dep = rec._id.department || 'Unknown';
      const day = rec._id.day;

      if (!depMap[dep]) depMap[dep] = {};
      depMap[dep][day] = rec;

      if (!daySummary[day]) {
        daySummary[day] = { total: 0, face: 0, maternity: 0, annual: 0, unpaid: 0, sick: 0, absent: 0 };
      }

      // combine summary
      daySummary[day].total += rec.total || 0;
      daySummary[day].face += rec.present || 0;
      daySummary[day].maternity += rec.maternity || 0;
      daySummary[day].annual += rec.annual || 0;
      daySummary[day].unpaid += rec.unpaid || 0;
      daySummary[day].sick += rec.sick || 0;
      daySummary[day].absent += rec.absent || 0;
    }

    // 4️⃣ Calculate summary rows
    const summaryRows = [
      { label: 'TOTAL EMPLOYEE', type: 'summary', data: {} },
      { label: 'FACE SCAN', type: 'summary', data: {} },
      { label: 'MATERNITY LEAVE', type: 'summary', data: {} },
      { label: 'ANNUAL LEAVE', type: 'summary', data: {} },
      { label: 'UNPAID LEAVE', type: 'summary', data: {} },
      { label: 'SICK LEAVE', type: 'summary', data: {} },
      { label: 'ABSENT RATE', type: 'summary', data: {} },
    ];

    for (let d = 1; d <= daysInMonth; d++) {
      const s = daySummary[d] || {};
      summaryRows[0].data[d] = s.total || 0;
      summaryRows[1].data[d] = s.face || 0;
      summaryRows[2].data[d] = s.maternity || 0;
      summaryRows[3].data[d] = s.annual || 0;
      summaryRows[4].data[d] = s.unpaid || 0;
      summaryRows[5].data[d] = s.sick || 0;
      const rate = s.total ? ((s.absent / s.total) * 100).toFixed(1) : 0;
      summaryRows[6].data[d] = Number(rate);
    }

    // 5️⃣ Build department rows
    const depRows = departmentNames.map(dep => {
      const row = { department: dep };
      for (let d = 1; d <= daysInMonth; d++) {
        const rec = depMap[dep]?.[d];
        const rate = rec && rec.total ? ((rec.present / rec.total) * 100).toFixed(1) : 0;
        row[d] = Number(rate);
      }
      return row;
    });

    res.json({
      ok: true,
      year: y,
      month: m,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      summary: summaryRows,
      departments: depRows,
    });
  } catch (err) {
    console.error('❌ getDailyAttendanceReport error:', err);
    res.status(500).json({ message: 'Failed to build daily report', error: err.message });
  }
};
