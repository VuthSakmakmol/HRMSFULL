/* eslint-disable no-console */
const dayjs = require('dayjs');
const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');
const ShiftTemplate = require('../../models/hrss/shiftTemplate');

const TZ = process.env.TZ || 'Asia/Phnom_Penh';

/**
 * Daily Attendance Report (matrix-style per position or department per day)
 */
exports.getDailyAttendanceReport = async (req, res) => {
  try {
    const company = req.company;
    const y = Number(req.query.year);
    const m = Number(req.query.month);
    if (!company || !y || !m)
      return res.status(400).json({ message: 'Missing company/year/month' });

    const start = dayjs.tz(`${y}-${String(m).padStart(2, '0')}-01`, TZ).startOf('month').toDate();
    const end = dayjs(start).add(1, 'month').toDate();

    // 1️⃣ Load all employee positions (unique list)
    const employees = await Employee.find({ company }).select('position department').lean();
    const positions = Array.from(new Set(employees.map(e => e.position || e.department || 'Unknown'))).sort();

    // 2️⃣ Load attendance data for the month
    const records = await Attendance.aggregate([
      { $match: { company, date: { $gte: start, $lt: end } } },
      {
        $project: {
          date: 1,
          position: 1,
          department: 1,
          status: 1,
        },
      },
      {
        $group: {
          _id: {
            pos: { $ifNull: ['$position', '$department'] },
            day: { $dayOfMonth: '$date' },
          },
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'OnTime'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.pos': 1, '_id.day': 1 } },
    ]);

    // 3️⃣ Convert attendance into a lookup map
    const attMap = {};
    for (const rec of records) {
      const key = rec._id.pos || 'Unknown';
      const day = rec._id.day;
      if (!attMap[key]) attMap[key] = {};
      attMap[key][day] = {
        present: rec.present,
        absent: rec.absent,
        leave: rec.leave,
        total: rec.total,
        rate: rec.total ? ((rec.present / rec.total) * 100).toFixed(1) : 0,
      };
    }

    // 4️⃣ Ensure every position appears in result
    const daysInMonth = dayjs(start).daysInMonth();
    const rows = positions.map(pos => {
      const row = { department: pos };
      for (let d = 1; d <= daysInMonth; d++) {
        row[d] = attMap[pos]?.[d]?.rate || 0; // default 0 = absent
      }
      return row;
    });

    return res.json({
      ok: true,
      year: y,
      month: m,
      days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
      rows,
    });
  } catch (err) {
    console.error('❌ getDailyAttendanceReport error:', err);
    res.status(500).json({ message: 'Failed to build daily report', error: err.message });
  }
};
