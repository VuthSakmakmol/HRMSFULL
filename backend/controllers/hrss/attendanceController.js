const Attendance   = require('../../models/hrss/attendances');
const Employee     = require('../../models/hrss/employee');
const WorkCalendar = require('../../models/hrss/workCalendar');
const XLSX         = require('xlsx');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Phnom_Penh';

/* ───────────────────────── helpers (TZ-aware) ───────────────────────── */
function toMinutes(time) { const [h, m] = String(time).split(':').map(Number); return h * 60 + m; }

function startOfDayTZ(dLike) { return dayjs.tz(dLike, TZ).startOf('day'); }

function parseTimeToDateTZ(baseDateStr, timeStr) {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  return dayjs.tz(baseDateStr, TZ).hour(h).minute(m).second(0).millisecond(0).toDate();
}

function formatExcelDate(value) {
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const { y, m, d } = parsed;
      return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return null;
}

function evaluateStatus(startTime, endTime, shiftType) {
  if (!startTime || !endTime) return { status: 'Absent', overtimeMinutes: 0 };

  let startMin = toMinutes(startTime);
  let endMin   = toMinutes(endTime);
  let overtimeMinutes = 0;

  if (shiftType === 'Day Shift') {
    const expectedStart = toMinutes('07:00');
    const expectedEnd   = toMinutes('16:00');
    const late = startMin > expectedStart + 15;
    if (endMin > expectedEnd + 1) overtimeMinutes = endMin - (expectedEnd + 1);
    return { status: late ? 'Late' : 'OnTime', overtimeMinutes };
  }

  if (shiftType === 'Night Shift') {
    const expectedStart = toMinutes('18:00');
    const expectedEnd   = toMinutes('03:00') + 1440; // crosses midnight
    if (startMin < expectedStart) startMin += 1440;
    if (endMin   < expectedStart) endMin   += 1440;
    const late = startMin > expectedStart + 15;
    if (endMin > expectedEnd + 1) overtimeMinutes = endMin - (expectedEnd + 1);
    return { status: late ? 'Late' : 'OnTime', overtimeMinutes };
  }

  return { status: 'Absent', overtimeMinutes: 0 };
}

function guessShiftFromTimes(startTime, endTime) {
  if (!startTime && !endTime) return null;
  if (startTime) {
    const sm = toMinutes(startTime);
    if (sm >= toMinutes('05:00') && sm <= toMinutes('11:59')) return 'Day Shift';
    if (sm >= toMinutes('16:00') && sm <= toMinutes('23:59')) return 'Night Shift';
  }
  if (endTime) {
    const em = toMinutes(endTime);
    if (em >= toMinutes('00:00') && em <= toMinutes('06:00')) return 'Night Shift';
  }
  return null;
}

async function getDayType(company, dateOnly) {
  const d0 = startOfDayTZ(dateOnly).toDate(); // store & query by local midnight
  const cal = await WorkCalendar.findOne({ company, date: d0 });
  if (cal) return cal.dayType;
  const dow = dayjs.tz(d0, TZ).day(); // 0=Sunday (PHN)
  return dow === 0 ? 'Sunday' : 'Working';
}

/* ─────────────────────── import (validate/commit) ─────────────────────── */
exports.importAttendance = async (req, res) => {
  try {
    const {
      mode = 'commit',
      allowMismatch = false,
      allowNonWorking = false,
      shiftType,
      rows = []
    } = req.body;

    const company = req.company;
    if (!company || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Missing company or empty rows' });
    }

    // detect date from first valid row
    const firstValidDateStr = rows.map(r => formatExcelDate(r.date)).find(Boolean);
    if (!firstValidDateStr) return res.status(400).json({ message: 'Cannot detect date from file.' });

    const dateOnlyLocal = startOfDayTZ(firstValidDateStr); // PHN
    const dayType  = await getDayType(company, dateOnlyLocal.toDate());
    const isNonWorking = (dayType === 'Sunday' || dayType === 'Holiday');

    // build employee cache (by id)
    const ids = [...new Set(rows.map(r => (r.employeeId || '').trim()).filter(Boolean))];
    const empsById = {};
    if (ids.length) {
      const empDocs = await Employee.find({ company, employeeId: { $in: ids } })
        .select('employeeId englishFirstName englishLastName department position line defaultShift company');
      for (const e of empDocs) empsById[e.employeeId.trim()] = e;
    }

    // fallback by full name
    const wantNames = rows.some(r => !r.employeeId && r.fullName);
    const empsByName = {};
    if (wantNames) {
      const allDocs = await Employee.find({ company })
        .select('employeeId englishFirstName englishLastName department position line defaultShift company');
      for (const e of allDocs) {
        const key = `${(e.englishFirstName||'').trim()} ${(e.englishLastName||'').trim()}`.trim().toLowerCase();
        empsByName[key] = e;
      }
    }

    const mismatches = [];
    const prepared = [];

    for (const r of rows) {
      const employeeIdRaw = (r.employeeId || '').trim();
      const dateStr       = formatExcelDate(r.date);
      if (!dateStr) continue;

      const startTime = (r.startTime || '').trim();
      const endTime   = (r.endTime   || '').trim();
      const leaveType = (r.leaveType || '').trim() || null;

      let empDoc = null;
      if (employeeIdRaw) empDoc = empsById[employeeIdRaw];
      if (!empDoc && r.fullName) {
        const key = String(r.fullName).trim().toLowerCase();
        empDoc = empsByName[key] || null;
      }

      const resolvedId = employeeIdRaw || (empDoc?.employeeId || '');
      const fullName   = empDoc
        ? `${empDoc.englishFirstName || ''} ${empDoc.englishLastName || ''}`.trim()
        : (r.fullName || 'Unknown');

      // expected vs scanned shift
      const empDefault = empDoc?.defaultShift;
      const guessed    = guessShiftFromTimes(startTime, endTime);
      const expected   = empDefault || guessed || shiftType || 'Day Shift';
      const scanned    = shiftType || guessed || expected;

      if (expected && scanned && expected !== scanned) {
        mismatches.push({
          employeeId: resolvedId || '—',
          fullName, startTime, endTime,
          expectedShift: expected,
          scannedShift: scanned
        });
      }

      prepared.push({
        employeeId: resolvedId,
        dateStr, startTime, endTime, leaveType,
        finalShift: scanned,
        fullName,
        department: empDoc?.department || '',
        position:   empDoc?.position   || '',
        line:       empDoc?.line       || ''
      });
    }

    if (mode === 'validate') {
      return res.json({
        ok: true,
        nonWorkingDay: isNonWorking ? dayType : null,
        shiftMismatches: mismatches,
        totalRows: rows.length,
        preparedCount: prepared.length
      });
    }

    if (isNonWorking && !allowNonWorking) {
      return res.status(409).json({
        ok: false,
        reason: 'NON_WORKING_DAY',
        dayType,
        message: `This date (${firstValidDateStr}) is ${dayType}. Change calendar or allow override.`
      });
    }

    if (mismatches.length && !allowMismatch) {
      return res.status(409).json({
        ok: false,
        reason: 'SHIFT_MISMATCH',
        message: 'Some employees scanned a different shift than expected',
        shiftMismatches: mismatches
      });
    }

    // UPSERTS (PHN-correct)
    const summary = [];
    for (const p of prepared) {
      if (!p.employeeId) continue;

      const date    = startOfDayTZ(p.dateStr).toDate();                 // local midnight
      const timeIn  = parseTimeToDateTZ(p.dateStr, p.startTime);        // local → UTC
      const timeOut = parseTimeToDateTZ(p.dateStr, p.endTime);

      const { status, overtimeMinutes } = evaluateStatus(p.startTime, p.endTime, p.finalShift);
      const overtimeHours = overtimeMinutes > 0 ? parseFloat((overtimeMinutes/60).toFixed(2)) : 0;
      const finalStatus = (!p.startTime && !p.endTime && p.leaveType) ? 'Leave' : status;

      const updated = await Attendance.findOneAndUpdate(
        { employeeId: p.employeeId, date, company },
        {
          employeeId: p.employeeId,
          date,
          shiftType: p.finalShift,
          timeIn,
          timeOut,
          status: finalStatus,
          leaveType: finalStatus === 'Leave' ? p.leaveType : null,
          overtimeHours,
          riskStatus: 'None',
          fullName: p.fullName || 'Unknown',
          company,
          department: p.department,
          position:   p.position,
          line:       p.line,
          note: (p.note || '')
        },
        { upsert: true, new: true }
      );

      if (['OnTime','Late','Overtime'].includes(updated.status)) {
        await Employee.findOneAndUpdate({ employeeId: p.employeeId, company }, { status: 'Working' });
      }

      // consecutive absence risk logic
      if (updated.status === 'Absent') {
        const currentDate = startOfDayTZ(updated.date); // local day
        let consecutiveAbsent = 1;

        for (let i = 1; i <= 10; i++) {
          const prevStart = currentDate.subtract(i, 'day').toDate();
          const prevEnd   = currentDate.subtract(i - 1, 'day').toDate();

          const prev = await Attendance.findOne({
            employeeId: p.employeeId,
            company,
            date: { $gte: prevStart, $lt: prevEnd },
          });
          if (prev?.status === 'Absent') consecutiveAbsent++; else break;
        }

        if (consecutiveAbsent >= 6) {
          const start = currentDate.subtract(5, 'day').toDate();
          await Attendance.updateMany(
            { employeeId: p.employeeId, company, date: { $gte: start, $lt: currentDate.add(1,'day').toDate() }, status: 'Absent' },
            { riskStatus: 'Abandon' }
          );
          await Employee.findOneAndUpdate({ employeeId: p.employeeId, company }, { status: 'Abandon' });
        } else if (consecutiveAbsent >= 3) {
          const start = currentDate.subtract(consecutiveAbsent - 1, 'day').toDate();
          await Attendance.updateMany(
            { employeeId: p.employeeId, company, date: { $gte: start, $lt: currentDate.add(1,'day').toDate() }, status: 'Absent' },
            { riskStatus: 'NearlyAbandon' }
          );
        }
      }

      if (['OnTime', 'Late'].includes(updated.status)) {
        const currentDate = startOfDayTZ(updated.date);
        let wasRisk = false;

        for (let i = 1; i <= 10; i++) {
          const prevStart = currentDate.subtract(i, 'day').toDate();
          const prevEnd   = currentDate.subtract(i - 1, 'day').toDate();

          const prev = await Attendance.findOne({
            employeeId: p.employeeId,
            company,
            date: { $gte: prevStart, $lt: prevEnd },
          });
          if (['NearlyAbandon','Abandon'].includes(prev?.riskStatus)) { wasRisk = true; break; }
        }

        updated.riskStatus = wasRisk ? 'Risk' : 'None';
        await updated.save();
      }

      summary.push({
        employeeId: p.employeeId,
        date: p.dateStr,
        status: updated.status,
        leaveType: updated.leaveType,
        overtimeHours: updated.overtimeHours,
        shiftType: updated.shiftType
      });
    }

    return res.json({
      ok: true,
      message: `✅ Imported ${summary.length} attendance records.`,
      warnings: {
        nonWorkingDay: isNonWorking ? dayType : null,
        shiftMismatches: mismatches
      },
      summary
    });

  } catch (err) {
    console.error('❌ Import error:', err);
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
};

/* ───────────────────── Leave update ───────────────────── */
exports.updateLeavePermission = async (req, res) => {
  try {
    const { rows } = req.body;
    const company = req.company;
    if (!company || !Array.isArray(rows)) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    const result = [];
    for (const row of rows) {
      const employeeId = row.employeeId?.trim();
      const shiftType  = row.shiftType?.trim();
      const leaveType  = row.leaveType?.trim();
      const formattedDateStr = formatExcelDate(row.date);
      if (!employeeId || !leaveType || !formattedDateStr) continue;

      const date = startOfDayTZ(formattedDateStr).toDate();
      const existing = await Attendance.findOne({ employeeId, company, date, shiftType });
      if (existing) {
        existing.status = 'Leave';
        existing.leaveType = leaveType;
        await existing.save();
        result.push({ employeeId, date: formattedDateStr, updated: true });
      } else {
        const emp = await Employee.findOne({ employeeId, company });
        const fullName = emp ? `${emp.englishFirstName} ${emp.englishLastName}` : 'Unknown';
        const newLeave = new Attendance({
          employeeId, date, shiftType, status: 'Leave', leaveType, company, fullName
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

/* ───────────────────── Dot summary (GitHub-style) ───────────────────── */
// GET /api/attendance/dots?year=2025&month=8  (month 1..12)
exports.getAttendanceDotSummary = async (req, res) => {
  try {
    const company = req.company;
    const yearRaw = req.query.year;
    const monthRaw = req.query.month; // 1..12 as string or number

    // Robust parsing
    const year  = Number.parseInt(yearRaw, 10);
    const month = Number.parseInt(monthRaw, 10);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'year and month are required (month 1..12)' });
    }

    // Build PHN-local month window using string form (more reliable than object form)
    const monthStr = String(month).padStart(2, '0');
    const startLocal = dayjs.tz(`${year}-${monthStr}-01 00:00:00`, TZ).startOf('day');

    if (!startLocal.isValid()) {
      return res.status(400).json({ message: 'Invalid year/month after parsing' });
    }

    const endLocal = startLocal.add(1, 'month');

    // Convert to JS Date for Mongo (these are instants bounding the local month)
    const start = startLocal.toDate();
    const end   = endLocal.toDate();

    // Attendance counts grouped by PHN-local day
    const att = await Attendance.aggregate([
      { $match: { company, date: { $gte: start, $lt: end } } },
      { $project: { d: { $dateTrunc: { date: "$date", unit: "day", timezone: TZ } } } },
      { $group: { _id: "$d", c: { $sum: 1 } } }
    ]);
    const attMap = new Map(att.map(a => [new Date(a._id).toISOString(), a.c]));

    // Calendar rows in range (Holiday/Sunday overrides)
    const calDocs = await WorkCalendar.find({ company, date: { $gte: start, $lt: end } }).lean();
    const calMap = new Map(
      (calDocs || []).map(c => [
        dayjs.tz(c.date, TZ).startOf('day').toDate().toISOString(),
        c.dayType // 'Working' | 'Holiday' | 'Sunday' | 'SpecialWorking'
      ])
    );

    const daysInMonth = startLocal.daysInMonth();
    const dots = [];

    for (let i = 0; i < daysInMonth; i++) {
      const dLocal = startLocal.add(i, 'day');
      const keyIso = dLocal.startOf('day').toDate().toISOString();
      const count  = attMap.get(keyIso) || 0;

      // Holiday > Sunday > Missing > Working
      const calType = calMap.get(keyIso) || null;
      let status;
      if (calType === 'Holiday') status = 'holiday';
      else if (calType === 'Sunday' || (!calType && dLocal.day() === 0)) status = 'sunday';
      else if (count === 0) status = 'missing';
      else status = 'working';

      dots.push({ date: dLocal.format('YYYY-MM-DD'), status, count });
    }

    return res.json({ year, month, dots });
  } catch (err) {
    console.error('❌ getAttendanceDotSummary error:', err);
    res.status(500).json({ message: 'Dot summary failed', error: err.message });
  }
};


/* ───────────────────── Basic fetch endpoints ───────────────────── */
exports.getAllAttendance = async (req, res) => {
  try {
    const company = req.company;
    const records = await Attendance.find({ company }).sort({ date: -1 });
    const employeeIds = [...new Set(records.map(r => r.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds }, company })
      .select('employeeId department position line');
    const employeeMap = {};
    employees.forEach(emp => { employeeMap[emp.employeeId] = {
      department: emp.department || '', position: emp.position || '', line: emp.line || '',
    }; });
    const enriched = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return { ...record.toObject(), department: empInfo.department || '-', position: empInfo.position || '-', line: empInfo.line || '-' };
    });
    res.json(enriched);
  } catch (err) {
    console.error('❌ Fetch error:', err.message);
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.getDayShiftAttendance = async (req, res) => {
  try {
    const company = req.company;
    const records = await Attendance.find({ shiftType: 'Day Shift', company }).sort({ date: -1 });
    const employeeIds = [...new Set(records.map(r => r.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds }, company })
      .select('employeeId department position line');
    const employeeMap = {};
    employees.forEach(emp => { employeeMap[emp.employeeId] = {
      department: emp.department || '', position: emp.position || '', line: emp.line || '',
    }; });
    const enriched = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return { ...record.toObject(), department: empInfo.department || '-', position: empInfo.position || '-', line: empInfo.line || '-' };
    });
    res.json(enriched);
  } catch (err) {
    console.error('❌ Day shift fetch error:', err.message);
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.getNightShiftAttendance = async (req, res) => {
  try {
    const company = req.company;
    const records = await Attendance.find({ shiftType: 'Night Shift', company }).sort({ date: -1 });
    const employeeIds = [...new Set(records.map(r => r.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds }, company })
      .select('employeeId department position line');
    const employeeMap = {};
    employees.forEach(emp => { employeeMap[emp.employeeId] = {
      department: emp.department || '', position: emp.position || '', line: emp.line || '',
    }; });
    const enriched = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return { ...record.toObject(), department: empInfo.department || '-', position: empInfo.position || '-', line: empInfo.line || '-' };
    });
    res.json(enriched);
  } catch (err) {
    console.error('❌ Night shift fetch error:', err.message);
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.getPaginatedAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 50, date } = req.query;
    const company = req.company;
    const parsedLimit = limit === 'All' ? 0 : Number(limit);
    const skip = (page - 1) * parsedLimit;

    const query = { company };
    if (date) {
      const start = startOfDayTZ(date).toDate();                // ✅ PHN start
      const end   = startOfDayTZ(date).add(1, 'day').toDate();  // ✅ PHN end
      query.date = { $gte: start, $lt: end };
    }

    const attendanceQuery = Attendance.find(query).sort({ date: -1 });
    if (parsedLimit > 0) attendanceQuery.skip(skip).limit(parsedLimit);

    const [records, total] = await Promise.all([
      attendanceQuery.exec(),
      Attendance.countDocuments(query)
    ]);

    const employeeIds = [...new Set(records.map(r => r.employeeId?.trim().toUpperCase()).filter(Boolean))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds }, company })
      .select('employeeId englishFirstName englishLastName department position line');

    const employeeMap = {};
    employees.forEach(emp => {
      const key = emp.employeeId.trim().toUpperCase();
      employeeMap[key] = {
        fullName: `${emp.englishFirstName} ${emp.englishLastName}`,
        department: emp.department || '',
        position:   emp.position   || '',
        line:       emp.line       || ''
      };
    });

    const enriched = records.map(record => {
      const key = record.employeeId?.trim().toUpperCase();
      const empInfo = employeeMap[key] || {};
      return {
        ...record.toObject(),
        fullName: empInfo.fullName || 'Unknown',
        department: empInfo.department || '-',
        position:   empInfo.position   || '-',
        line:       empInfo.line       || '-'
      };
    });

    res.json({
      records: enriched,
      total,
      page: Number(page),
      limit: limit === 'All' ? 'All' : Number(limit),
      totalPages: limit === 'All' ? 1 : Math.ceil(total / (parsedLimit || total))
    });
  } catch (err) {
    console.error('❌ Pagination fetch error:', err.message);
    res.status(500).json({ message: 'Pagination failed', error: err.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const company = req.company;
    const updated = await Attendance.findOneAndUpdate(
      { _id: req.params.id, company }, req.body, { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: '✅ Updated', data: updated });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const company = req.company;
    const deleted = await Attendance.findOneAndDelete({ _id: req.params.id, company });
    if (!deleted) return res.status(404).json({ message: 'Attendance record not found' });
    res.json({ message: '✅ Deleted', data: deleted });
  } catch (err) {
    console.error('❌ Delete error:', err.message);
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

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
      totalPages: parsedLimit ? Math.ceil(total / parsedLimit) : 1
    });
  } catch (error) {
    console.error('❌ getAttendanceHistoryByEmployeeId error:', error);
    res.status(500).json({ message: 'Error fetching attendance history' });
  }
};
