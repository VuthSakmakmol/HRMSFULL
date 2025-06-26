const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');

// Helper: Convert "HH:mm" string to minutes
function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Helper: Determine status based on time
function evaluateStatus(startTime, endTime, shiftType) {
  if (!startTime || !endTime) return 'Absent';

  let startMin = toMinutes(startTime);
  let endMin = toMinutes(endTime);

  if (shiftType === 'Day Shift') {
    const expectedStart = toMinutes('07:00');
    const expectedEnd = toMinutes('16:00');
    const lateThreshold = expectedStart + 15;

    if (startMin > lateThreshold) return 'Late';
    if (endMin > expectedEnd + 1) return 'Overtime';
    return 'OnTime';

  } else if (shiftType === 'Night Shift') {
    const expectedStart = toMinutes('18:00');
    const expectedEnd = toMinutes('03:00') + 1440;

    if (startMin < expectedStart) startMin += 1440;
    if (endMin < expectedStart) endMin += 1440;

    const lateThreshold = expectedStart + 15;

    if (startMin > lateThreshold) return 'Late';
    if (endMin > expectedEnd + 1) return 'Overtime';
    return 'OnTime';
  }

  return 'Absent';
}

// Helper: Convert "HH:mm" to JS Date using baseDate
function parseTimeToDate(baseDate, timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const dateObj = new Date(baseDate);
  dateObj.setHours(h);
  dateObj.setMinutes(m);
  dateObj.setSeconds(0);
  return dateObj;
}

// ===================== Import Attendance ======================
exports.importAttendance = async (req, res) => {
  try {
    const { shiftType, rows } = req.body;
    const user = req.user;

    if (!user || !user.company) {
      return res.status(401).json({ message: 'Unauthorized: No company context' });
    }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'No data provided' });
    }

    const company = user.company;
    const rawDate = rows[0].date || new Date().toISOString().split('T')[0];
    const baseDate = new Date(rawDate);
    const summary = [];

    // Optional: clear old data for the same shift + date + company
    await Attendance.deleteMany({ date: baseDate, shiftType, company });

    for (const row of rows) {
      const employeeId = row.employeeId?.trim();
      const startTimeStr = row.startTime?.trim();
      const endTimeStr = row.endTime?.trim();

      if (!employeeId) continue;

      const emp = await Employee.findOne({ employeeId, company });
      const fullName = emp ? `${emp.englishFirstName} ${emp.englishLastName}` : 'Unknown';

      const timeIn = parseTimeToDate(baseDate, startTimeStr);
      const timeOut = parseTimeToDate(baseDate, endTimeStr);
      const status = evaluateStatus(startTimeStr, endTimeStr, shiftType);

      await Attendance.create({
        employeeId,
        date: baseDate,
        shiftType,
        timeIn,
        timeOut,
        status,
        fullName,
        company,
      });

      summary.push({
        employeeId,
        fullName,
        shiftType,
        status,
        date: baseDate.toISOString().split('T')[0]
      });
    }

    res.json({
      message: '✅ Attendance imported successfully!',
      summary
    });

  } catch (err) {
    console.error('❌ Attendance import error:', err.message);
    res.status(500).json({ message: 'Failed to import attendance', error: err.message });
  }
};

// ===================== Get All Attendance ======================
exports.getAllAttendance = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.company) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const attendance = await Attendance.find({ company: user.company }).sort({ date: -1 });

    if (!attendance || attendance.length === 0) {
      console.log('\x1b[33m⚠️ No attendance records found.\x1b[0m');
    } else {
      console.log(`\x1b[32m✅ Attendance records fetched: ${attendance.length}\x1b[0m`);
      console.log('🧾 Sample record:', attendance[0]);
    }

    res.json(attendance);
  } catch (err) {
    console.error('\x1b[31m❌ Error fetching attendance:\x1b[0m', err.message);
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
};

// ===================== Shift Attendance ======================
exports.getDayShiftAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ shiftType: 'Day Shift', company: req.user.company }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch day shift attendance', error: err.message });
  }
};

exports.getNightShiftAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ shiftType: 'Night Shift', company: req.user.company }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch night shift attendance', error: err.message });
  }
};

// ===================== Pagination ======================
exports.getPaginatedAttendance = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const company = req.user.company;

    const [records, total] = await Promise.all([
      Attendance.find({ company }).sort({ date: -1 }).skip(skip).limit(limit),
      Attendance.countDocuments({ company })
    ]);

    res.json({ records, total, page, limit });
  } catch (err) {
    res.status(500).json({ message: 'Pagination failed', error: err.message });
  }
};

// ===================== Update Attendance ======================
exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const update = req.body;
    const company = req.user.company;

    const updated = await Attendance.findOneAndUpdate({ _id: id, company }, update, { new: true });

    if (!updated) {
      return res.status(404).json({ message: 'Attendance record not found or unauthorized' });
    }

    res.json({ message: '✅ Attendance updated successfully', data: updated });
  } catch (err) {
    console.error('❌ Update error:', err.message);
    res.status(500).json({ message: 'Failed to update attendance', error: err.message });
  }
};
