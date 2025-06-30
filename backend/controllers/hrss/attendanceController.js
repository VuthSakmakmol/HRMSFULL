const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');
const XLSX = require('xlsx');

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function parseTimeToDate(baseDate, timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(h, m, 0, 0);
  return date;
}

function formatExcelDate(value) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const { y, m, d } = parsed;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return null;
}

function evaluateStatus(startTime, endTime, shiftType) {
  if (!startTime || !endTime) return 'Absent';
  let startMin = toMinutes(startTime);
  let endMin = toMinutes(endTime);

  if (shiftType === 'Day Shift') {
    const expectedStart = toMinutes('07:00');
    const expectedEnd = toMinutes('16:00');
    if (startMin > expectedStart + 15) return 'Late';
    if (endMin > expectedEnd + 1) return 'Overtime';
    return 'OnTime';
  }

  if (shiftType === 'Night Shift') {
    const expectedStart = toMinutes('18:00');
    const expectedEnd = toMinutes('03:00') + 1440;
    if (startMin < expectedStart) startMin += 1440;
    if (endMin < expectedStart) endMin += 1440;
    if (startMin > expectedStart + 15) return 'Late';
    if (endMin > expectedEnd + 1) return 'Overtime';
    return 'OnTime';
  }

  return 'Absent';
}

exports.importAttendance = async (req, res) => {
  try {
    const { shiftType, rows } = req.body;
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];

    if (!companies.length || !rows?.length) {
      console.error('❌ Missing company or empty rows');
      return res.status(400).json({ message: 'Missing company or empty rows' });
    }

    const summary = [];

    for (const row of rows) {
      const employeeId = row.employeeId?.trim();
      const formattedDateStr = formatExcelDate(row.date);
      if (!employeeId || !formattedDateStr) continue;

      const date = new Date(formattedDateStr);
      const startTime = row.startTime?.trim();
      const endTime = row.endTime?.trim();
      const timeIn = parseTimeToDate(date, startTime);
      const timeOut = parseTimeToDate(date, endTime);
      const leaveType = row.leaveType?.trim() || null;
      const status = evaluateStatus(startTime, endTime, shiftType);

      let foundEmp = await Employee.findOne({
        employeeId,
        company: { $in: companies },
      });

      const company = foundEmp ? foundEmp.company : companies[0]; // fallback

      const fullName = foundEmp
        ? `${foundEmp.englishFirstName} ${foundEmp.englishLastName}`
        : 'Unknown';

      // Determine status if absent but leaveType present:
      const finalStatus = (!startTime && !endTime && leaveType) ? 'Leave' : status;

      const updated = await Attendance.findOneAndUpdate(
        { employeeId, date, company },
        {
          employeeId,
          date,
          shiftType,
          timeIn,
          timeOut,
          status: finalStatus,
          leaveType: finalStatus === 'Leave' ? leaveType : null,
          fullName,
          company,
          note: row.note || '',
        },
        { upsert: true, new: true }
      );

      summary.push({
        employeeId,
        date: formattedDateStr,
        status: updated.status,
        leaveType: updated.leaveType,
        company,
      });
    }

    res.json({
      message: `✅ Imported ${summary.length} attendance records.`,
      summary,
    });
  } catch (err) {
    console.error('❌ Import error:', err.message);
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
};

exports.updateLeavePermission = async (req, res) => {
  try {
    const { rows } = req.body;
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];

    if (!companies.length || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'Invalid input' });
    }

    const result = [];

    for (const row of rows) {
      const employeeId = row.employeeId?.trim();
      const shiftType = row.shiftType?.trim();
      const leaveType = row.leaveType?.trim();
      const formattedDateStr = formatExcelDate(row.date);
      if (!employeeId || !leaveType || !formattedDateStr) continue;

      const date = new Date(formattedDateStr);

      const existing = await Attendance.findOne({
        employeeId,
        company: { $in: companies },
        date,
        shiftType,
      });

      if (existing) {
        existing.status = 'Leave';
        existing.leaveType = leaveType;
        await existing.save();
        result.push({ employeeId, date: formattedDateStr, updated: true });
      } else {
        // If not exist: create new leave record
        const emp = await Employee.findOne({
          employeeId,
          company: { $in: companies }
        });

        const company = emp ? emp.company : companies[0];
        const fullName = emp
          ? `${emp.englishFirstName} ${emp.englishLastName}`
          : 'Unknown';

        const newLeave = new Attendance({
          employeeId,
          date,
          shiftType,
          status: 'Leave',
          leaveType,
          company,
          fullName,
        });

        await newLeave.save();
        result.push({ employeeId, date: formattedDateStr, created: true });
      }
    }

    res.json({ message: `✅ Leave records processed: ${result.length}`, result });
  } catch (err) {
    console.error('❌ Leave update error:', err.message);
    res.status(500).json({ message: 'Leave update failed', error: err.message });
  }
};


exports.getAllAttendance = async (req, res) => {
  try {
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];
    const records = await Attendance.find({ company: { $in: companies } }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.getDayShiftAttendance = async (req, res) => {
  try {
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];
    const records = await Attendance.find({
      shiftType: 'Day Shift',
      company: { $in: companies },
    }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.getNightShiftAttendance = async (req, res) => {
  try {
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];
    const records = await Attendance.find({
      shiftType: 'Night Shift',
      company: { $in: companies },
    }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.getPaginatedAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find({ company: { $in: companies } }).sort({ date: -1 }).skip(skip).limit(limit),
      Attendance.countDocuments({ company: { $in: companies } }),
    ]);

    res.json({
      records,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Pagination failed', error: err.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const companies = Array.isArray(req.user.company) ? req.user.company : [req.user.company];
    const updated = await Attendance.findOneAndUpdate(
      { _id: req.params.id, company: { $in: companies } },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: '✅ Updated', data: updated });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};
