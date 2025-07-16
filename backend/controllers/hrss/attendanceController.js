const Attendance = require('../../models/hrss/attendances');
const Employee = require('../../models/hrss/employee');
const XLSX = require('xlsx');

// ────────────────────────────────────────────────────────────────────────────────
// Utility functions
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
  if (!startTime || !endTime) return { status: 'Absent', overtimeMinutes: 0 };

  let startMin = toMinutes(startTime);
  let endMin = toMinutes(endTime);

  let overtimeMinutes = 0;

  if (shiftType === 'Day Shift') {
    const expectedStart = toMinutes('07:00');
    const expectedEnd = toMinutes('16:00');

    const late = startMin > expectedStart + 15;
    if (endMin > expectedEnd + 1) overtimeMinutes = endMin - (expectedEnd + 1);

    return { status: late ? 'Late' : 'OnTime', overtimeMinutes };
  }

  if (shiftType === 'Night Shift') {
    const expectedStart = toMinutes('18:00');
    const expectedEnd = toMinutes('03:00') + 1440; // Night shift spans midnight

    if (startMin < expectedStart) startMin += 1440;
    if (endMin < expectedStart) endMin += 1440;

    const late = startMin > expectedStart + 15;
    if (endMin > expectedEnd + 1) overtimeMinutes = endMin - (expectedEnd + 1);

    return { status: late ? 'Late' : 'OnTime', overtimeMinutes };
  }

  return { status: 'Absent', overtimeMinutes: 0 };
}


// ────────────────────────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────────────────────────
// Import attendance records (UPDATED)
exports.importAttendance = async (req, res) => {
  try {
    const { shiftType, rows } = req.body;
    const company = req.company;
    if (!company || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Missing company or empty rows' });
    }

    const summary = [];
    const chunkArray = (array, size) => {
      const result = [];
      for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
      }
      return result;
    };

    const chunks = chunkArray(rows, 500);

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(chunk.map(async (row) => {
        try {
          const employeeId       = row.employeeId?.trim();
          const formattedDateStr = formatExcelDate(row.date);
          if (!employeeId || !formattedDateStr) return null;

          const date      = new Date(formattedDateStr);
          const startTime = row.startTime?.trim();
          const endTime   = row.endTime?.trim();
          const timeIn    = parseTimeToDate(date, startTime);
          const timeOut   = parseTimeToDate(date, endTime);
          const leaveType = row.leaveType?.trim() || null;

          // Determine status & overtime
          const { status, overtimeMinutes } =
            evaluateStatus(startTime, endTime, shiftType);
          const overtimeHours = overtimeMinutes > 0
            ? parseFloat((overtimeMinutes / 60).toFixed(2))
            : 0;

          // Fetch employee for name + dept info
          const foundEmp  = await Employee.findOne({ employeeId, company });
          const empCompany= foundEmp ? foundEmp.company : company;
          const fullName  = foundEmp
            ? `${foundEmp.englishFirstName} ${foundEmp.englishLastName}`
            : 'Unknown';

          const finalStatus = (!startTime && !endTime && leaveType)
            ? 'Leave'
            : status;

          // Upsert the attendance record
          const updated = await Attendance.findOneAndUpdate(
            { employeeId, date, company: empCompany },
            {
              employeeId,
              date,
              shiftType,
              timeIn,
              timeOut,
              status: finalStatus,
              leaveType: finalStatus === 'Leave' ? leaveType : null,
              overtimeHours,
              riskStatus: 'None',       // default; we'll adjust below
              fullName,
              company: empCompany,
              department: foundEmp?.department || '',
              position:   foundEmp?.position   || '',
              line:       foundEmp?.line       || '',
              note:       row.note             || '',
            },
            { upsert: true, new: true }
          );

          // ─── Reset to Working on any normal attendance ───────────────────────
          if (['OnTime','Late','Overtime'].includes(updated.status)) {
            await Employee.findOneAndUpdate(
              { employeeId, company: empCompany },
              { status: 'Working' }
            );
          }

          // ─── Consecutive absence → NearlyAbandon / Abandon ──────────────────
          if (updated.status === 'Absent') {
            const currentDate = new Date(updated.date);
            let consecutiveAbsent = 1;

            // look back up to 10 days
            for (let i = 1; i <= 10; i++) {
              const prevDate = new Date(currentDate);
              prevDate.setDate(currentDate.getDate() - i);

              const prev = await Attendance.findOne({
                employeeId,
                company,
                date: {
                  $gte: new Date(prevDate.setHours(0,0,0,0)),
                  $lt:  new Date(prevDate.setHours(23,59,59,999))
                },
              });
              if (prev?.status === 'Absent') consecutiveAbsent++;
              else break;
            }

            // 6+ → Abandon
            if (consecutiveAbsent >= 6) {
              const start = new Date(currentDate);
              start.setDate(currentDate.getDate() - 5);
              await Attendance.updateMany(
                {
                  employeeId,
                  company,
                  date:   { $gte: start, $lte: currentDate },
                  status: 'Absent'
                },
                { riskStatus: 'Abandon' }
              );
              console.log(`🚨 ${employeeId} marked Abandon`);

              // ← SYNC EMPLOYEE.status TO 'Abandon'
              await Employee.findOneAndUpdate(
                { employeeId, company: empCompany },
                { status: 'Abandon' }
              );
            }
            // 3–5 → NearlyAbandon
            else if (consecutiveAbsent >= 3) {
              const start = new Date(currentDate);
              start.setDate(currentDate.getDate() - (consecutiveAbsent - 1));
              await Attendance.updateMany(
                {
                  employeeId,
                  company,
                  date:   { $gte: start, $lte: currentDate },
                  status: 'Absent'
                },
                { riskStatus: 'NearlyAbandon' }
              );
              console.log(`⚠️ ${employeeId} marked NearlyAbandon`);
            }
          }

          // ─── Comeback logic (Risk flag) ─────────────────────────────────────
          if (['OnTime', 'Late'].includes(updated.status)) {
            const currentDate = new Date(updated.date);
            let wasRisk = false;

            for (let i = 1; i <= 10; i++) {
              const prevDate = new Date(currentDate);
              prevDate.setDate(currentDate.getDate() - i);

              const prev = await Attendance.findOne({
                employeeId,
                company,
                date: {
                  $gte: new Date(prevDate.setHours(0,0,0,0)),
                  $lt:  new Date(prevDate.setHours(23,59,59,999))
                },
              });
              if (['NearlyAbandon','Abandon'].includes(prev?.riskStatus)) {
                wasRisk = true; break;
              }
            }

            if (wasRisk) {
              updated.riskStatus = 'Risk';
              await updated.save();
              console.log(`⚠️ ${employeeId} marked Risk on comeback`);
            } else {
              updated.riskStatus = 'None';
              await updated.save();
            }
          }

          return {
            employeeId,
            date: formattedDateStr,
            status: updated.status,
            leaveType: updated.leaveType,
            overtimeHours: updated.overtimeHours,
            riskStatus: updated.riskStatus,
            company: empCompany,
          };
        } catch (err) {
          console.error(`❌ Row error for ${row.employeeId}:`, err.message);
          return { employeeId: row.employeeId || 'N/A', error: err.message };
        }
      }));

      summary.push(...chunkResults.filter(Boolean));
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


// ────────────────────────────────────────────────────────────────────────────────
// Update leave permission
exports.updateLeavePermission = async (req, res) => {
  try {
    const { rows } = req.body;
    const company = req.company;
    console.log('📅 Update Leave for company:', company);

    if (!company || !Array.isArray(rows)) {
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
        company,
        date,
        shiftType,
      });

      if (existing) {
        existing.status = 'Leave';
        existing.leaveType = leaveType;
        await existing.save();
        result.push({ employeeId, date: formattedDateStr, updated: true });
      } else {
        const emp = await Employee.findOne({ employeeId, company });
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

// ────────────────────────────────────────────────────────────────────────────────
// Fetch attendance
exports.getAllAttendance = async (req, res) => {
  try {
    const company = req.company;
    console.log('📄 Fetch All Attendance with employee details for company:', company);

    // Fetch all attendance records for the company
    const records = await Attendance.find({ company }).sort({ date: -1 });

    // Get all unique employee IDs from the attendance records
    const employeeIds = [...new Set(records.map(r => r.employeeId))];

    // Fetch all corresponding employees in one query
    const employees = await Employee.find({
      employeeId: { $in: employeeIds },
      company,
    }).select('employeeId department position line');

    // Create a map for quick lookup
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.employeeId] = {
        department: emp.department || '',
        position: emp.position || '',
        line: emp.line || '',
      };
    });

    // Attach employee info to each attendance record
    const enrichedRecords = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return {
        ...record.toObject(),
        department: empInfo.department || '-',
        position: empInfo.position || '-',
        line: empInfo.line || '-',
      };
    });

    res.json(enrichedRecords);
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};


exports.getDayShiftAttendance = async (req, res) => {
  try {
    const company = req.company;
    console.log('🌞 Fetch Day Shift Attendance with employee details for company:', company);

    const records = await Attendance.find({
      shiftType: 'Day Shift',
      company,
    }).sort({ date: -1 });

    const employeeIds = [...new Set(records.map(r => r.employeeId))];

    const employees = await Employee.find({
      employeeId: { $in: employeeIds },
      company,
    }).select('employeeId department position line');

    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.employeeId] = {
        department: emp.department || '',
        position: emp.position || '',
        line: emp.line || '',
      };
    });

    const enrichedRecords = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return {
        ...record.toObject(),
        department: empInfo.department || '-',
        position: empInfo.position || '-',
        line: empInfo.line || '-',
      };
    });

    res.json(enrichedRecords);
  } catch (err) {
    console.error('❌ Day shift fetch error:', err.message);
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};


exports.getNightShiftAttendance = async (req, res) => {
  try {
    const company = req.company;
    console.log('🌜 Fetch Night Shift Attendance with employee details for company:', company);

    const records = await Attendance.find({
      shiftType: 'Night Shift',
      company,
    }).sort({ date: -1 });

    const employeeIds = [...new Set(records.map(r => r.employeeId))];

    const employees = await Employee.find({
      employeeId: { $in: employeeIds },
      company,
    }).select('employeeId department position line');

    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.employeeId] = {
        department: emp.department || '',
        position: emp.position || '',
        line: emp.line || '',
      };
    });

    const enrichedRecords = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return {
        ...record.toObject(),
        department: empInfo.department || '-',
        position: empInfo.position || '-',
        line: empInfo.line || '-',
      };
    });

    res.json(enrichedRecords);
  } catch (err) {
    console.error('❌ Night shift fetch error:', err.message);
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};


exports.getPaginatedAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, date } = req.query; // include date from query params
    const company = req.company;
    console.log('📃 Fetch Paginated Attendance with employee details for company:', company);

    const parsedLimit = limit === 'All' ? 0 : Number(limit);
    const skip = (page - 1) * parsedLimit;

    // Build base query
    const query = { company };
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1); // include full day range
      query.date = { $gte: start, $lt: end };
    }

    const attendanceQuery = Attendance.find(query).sort({ date: -1 });
    if (parsedLimit > 0) attendanceQuery.skip(skip).limit(parsedLimit);

    const [records, total] = await Promise.all([
      attendanceQuery.exec(),
      Attendance.countDocuments(query),
    ]);

    const employeeIds = [
      ...new Set(records.map(r => r.employeeId?.trim().toUpperCase()).filter(Boolean))
    ];

    const employees = await Employee.find({
      employeeId: { $in: employeeIds },
      company,
    }).select('employeeId englishFirstName englishLastName department position line');

    const employeeMap = {};
    employees.forEach(emp => {
      const key = emp.employeeId.trim().toUpperCase();
      employeeMap[key] = {
        fullName: `${emp.englishFirstName} ${emp.englishLastName}`,
        department: emp.department || '',
        position: emp.position || '',
        line: emp.line || '',
      };
    });

    const enrichedRecords = records.map(record => {
      const key = record.employeeId?.trim().toUpperCase();
      const empInfo = employeeMap[key] || {};
      return {
        ...record.toObject(),
        fullName: empInfo.fullName || 'Unknown',
        department: empInfo.department || '-',
        position: empInfo.position || '-',
        line: empInfo.line || '-',
      };
    });

    res.json({
      records: enrichedRecords,
      total,
      page: Number(page),
      limit: limit === 'All' ? 'All' : Number(limit),
      totalPages: limit === 'All' ? 1 : Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    console.error('❌ Pagination fetch error:', err.message);
    res.status(500).json({ message: 'Pagination failed', error: err.message });
  }
};



// ────────────────────────────────────────────────────────────────────────────────
// Update single attendance record
exports.updateAttendance = async (req, res) => {
  try {
    const company = req.company;
    console.log('✏️ Update Attendance for company:', company);

    const updated = await Attendance.findOneAndUpdate(
      { _id: req.params.id, company },
      req.body,
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: '✅ Updated', data: updated });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};


// Delete single attendance record
exports.deleteAttendance = async (req, res) => {
  try {
    const company = req.company;
    const deleted = await Attendance.findOneAndDelete({
      _id: req.params.id,
      company,
    });
    if (!deleted) return res.status(404).json({ message: 'Attendance record not found' });
    res.json({ message: '✅ Deleted', data: deleted });
  } catch (err) {
    console.error('❌ Delete error:', err.message);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};



// ────────────────────────────────────────────────────────────────────────────────
// Fetch a single attendance by ID
exports.getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance not found' });
    res.json(attendance);
  } catch (err) {
    console.error('❌ getAttendanceById error:', err);
    res.status(500).json({ message: 'Failed to fetch attendance', error: err.message });
  }
};


// GET /api/attendance/history/:employeeId?page=1&limit=20
exports.getAttendanceHistoryByEmployeeId = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const employeeId = req.params.employeeId;
    const company = req.company;

    const parsedLimit = limit === 'All' ? 0 : Number(limit);
    const skip = (page - 1) * parsedLimit;

    const query = { employeeId, company };

    const attendanceQuery = Attendance.find(query).sort({ date: -1 });
    if (parsedLimit > 0) attendanceQuery.skip(skip).limit(parsedLimit);

    const [records, total] = await Promise.all([
      attendanceQuery.exec(),
      Attendance.countDocuments(query)
    ]);

    res.json({
      records,
      total,
      page: Number(page),
      limit: parsedLimit || 'All',
      totalPages: parsedLimit ? Math.ceil(total / parsedLimit) : 1,
    });
  } catch (error) {
    console.error('❌ getAttendanceHistoryByEmployeeId error:', error);
    res.status(500).json({ message: 'Error fetching attendance history' });
  }
};


