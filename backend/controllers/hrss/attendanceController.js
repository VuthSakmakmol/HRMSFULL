const Attendance = require('../../models/hrss/attendance');
const Employee = require('../../models/hrss/employee');
const dayjs = require('dayjs');

const importAttendance = async (req, res) => {
  try {
    const rows = req.body;

    if (!Array.isArray(rows)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    for (const row of rows) {
      const rawDate = row['Record Date'];      // e.g. "21/06/2025"
      const employeeId = row['Employee No'];   // e.g. "52510005"
      const rawTime = row['Time1'];            // e.g. "0712"

      if (!employeeId || !rawDate || !rawTime) continue;

      const date = dayjs(rawDate, 'DD/MM/YYYY');
      const day = date.date();                // 1-31
      const month = date.format('YYYY-MM');   // e.g. "2025-06"
      const time = `${rawTime.slice(0, 2)}:${rawTime.slice(2)}`; // e.g. 07:12

      // Determine status
      let status = 'On Time';
      if (time > '07:15') status = 'Late';

      // Find employee
      const emp = await Employee.findOne({ employeeId });
      const fullName = emp
        ? `${emp.khmerFirstName || ''} ${emp.khmerLastName || ''}`.trim()
        : 'Unknown';

      // Upsert attendance for the employee and month
      const doc = await Attendance.findOneAndUpdate(
        { employeeId, month },
        {
          $set: {
            [`days.${day}.timeIn`]: time,
            [`days.${day}.status`]: status,
            fullName,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Recalculate absent count
      let absent = 0;
      for (let i = 1; i <= 31; i++) {
        const d = doc.days[i];
        if (!d || d.status === 'Absent') absent++;
      }

      await Attendance.updateOne(
        { employeeId, month },
        {
          $set: {
            absentCount: absent,
            alert: absent >= 4 && absent <= 5,
            abandon: absent >= 6,
          },
        }
      );
    }

    return res.status(200).json({ message: '✅ Attendance imported successfully' });
  } catch (err) {
    console.error('❌ Attendance import error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { importAttendance };
