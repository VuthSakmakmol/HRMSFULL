// controllers/hrss/attendanceController.js
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

/* ───────────────────────── helpers ───────────────────────── */
const toMinutes = (time) => {
  if (!time) return 0;
  const [h, m] = String(time).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const startOfDayTZ = (dLike) => dayjs.tz(dLike, TZ).startOf('day');

const parseTimeToDateTZ = (baseDateStr, timeStr) => {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  return dayjs.tz(baseDateStr, TZ).hour(h || 0).minute(m || 0).second(0).millisecond(0).toDate();
};

/**
 * Accepts Excel serial numbers and many string formats:
 * - "YYYY-MM-DD", "YYYY-M-D"
 * - "D-M-YYYY", "DD-MM-YYYY"
 * - "M-D-YYYY" (fallback month-first)
 * - With separators "/", ".", " " (they are normalized)
 * Returns "YYYY-MM-DD" (date only) or null.
 */
const formatExcelDate = (value) => {
  if (value == null || value === '') return null;

  // 1) Excel serial (including fractional time) -> date part only
  if (typeof value === 'number' && isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, '0');
      const d = String(parsed.d).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  // 2) String formats
  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return null;

    // unify delimiters to "-": supports "/", ".", "\" and spaces
    s = s.replace(/[./\\\s]+/g, '-');

    // a) YYYY-MM-DD or YYYY-M-D
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return null;
    }

    // b) D-M-YYYY or DD-MM-YYYY (day-first; common locally)
    m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return null;
    }

    // c) fallback: let dayjs try anything else
    const tentative = dayjs(s);
    if (tentative.isValid()) return tentative.format('YYYY-MM-DD');
  }

  return null;
};

const normalizeShift = (s) => {
  if (!s) return null;
  const v = String(s).trim().toLowerCase();
  if (['day', 'day shift', 'dayshift', 'd', 'day_shift'].includes(v)) return 'Day Shift';
  if (['night', 'night shift', 'nightshift', 'n', 'night_shift'].includes(v)) return 'Night Shift';
  return null;
};

const evaluateStatus = (startTime, endTime, shiftType) => {
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
};

const guessShiftFromTimes = (startTime, endTime) => {
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
};

const getDayType = async (company, dateOnly) => {
  const d0 = startOfDayTZ(dateOnly).toDate();
  const cal = await WorkCalendar.findOne({ company, date: d0 }).lean();
  if (cal?.dayType) return cal.dayType;
  const dow = dayjs.tz(d0, TZ).day(); // 0=Sunday
  return dow === 0 ? 'Sunday' : 'Working';
};

/* ───────────────────── Import attendance (validate/commit) ─────────────────────
Body:
{
  mode?: 'validate' | 'commit'                // default 'commit'
  allowMismatch?: boolean                     // default false
  allowNonWorking?: boolean                   // default false
  mismatchPolicy?: 'expected' | 'scanned'     // default 'expected'
  shiftType?: 'Day Shift' | 'Night Shift'     // optional UI assumption
  rows: [{ employeeId?, fullName?, date, startTime, endTime, leaveType? }]
}
*/
exports.importAttendance = async (req, res) => {
  try {
    const {
      mode = 'commit',
      allowMismatch = false,
      allowNonWorking = false,
      mismatchPolicy = 'expected',
      shiftType,
      rows = []
    } = req.body;

    const company = req.company;
    if (!company || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'Missing company or empty rows' });
    }

    // Detect date of import
    const firstValidDateStr = rows.map(r => formatExcelDate(r.date)).find(Boolean);
    if (!firstValidDateStr) {
      const sample = rows.slice(0, 3).map((r,i) => `[${i}] date=${JSON.stringify(r.date)}`).join(', ');
      return res.status(400).json({
        message: 'Cannot detect date from file.',
        hint: `Sample values: ${sample}`
      });
    }
    const dateOnly = startOfDayTZ(firstValidDateStr).toDate();
    const dayType  = await getDayType(company, dateOnly);
    const isNonWorking = (dayType === 'Sunday' || dayType === 'Holiday');

    // Employee cache by ID (lean -> keep legacy fields like "shift")
    const ids = [...new Set(rows.map(r => (r.employeeId || '').trim()).filter(Boolean))];
    const empsById = {};
    if (ids.length) {
      const empDocs = await Employee.find({ company, employeeId: { $in: ids } })
        .select('employeeId englishFirstName englishLastName department position line defaultShift shift shiftName')
        .lean();

      for (const e of empDocs) {
        const empShift =
          normalizeShift(e.defaultShift) ||
          normalizeShift(e.shift) ||
          normalizeShift(e.shiftName) ||
          null;

        empsById[e.employeeId.trim()] = { ...e, __empShift: empShift };
      }
    }

    // Name-based cache (only if needed)
    const needNameLookup = rows.some(r => !r.employeeId && r.fullName);
    const empsByName = {};
    if (needNameLookup) {
      const allDocs = await Employee.find({ company })
        .select('employeeId englishFirstName englishLastName department position line defaultShift shift shiftName')
        .lean();

      for (const e of allDocs) {
        const key = `${(e.englishFirstName||'').trim()} ${(e.englishLastName||'').trim()}`.trim().toLowerCase();
        const empShift =
          normalizeShift(e.defaultShift) ||
          normalizeShift(e.shift) ||
          normalizeShift(e.shiftName) ||
          null;

        if (key) empsByName[key] = { ...e, __empShift: empShift };
      }
    }

    // Build prepared rows & mismatch list
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

      // Expected = employee saved shift (wins) → UI shiftType → guessed → Day
      const empShift = empDoc?.__empShift || null;
      const guessed  = guessShiftFromTimes(startTime, endTime);
      const expected = empShift || shiftType || guessed || 'Day Shift';
      const scanned  = guessed || shiftType || expected;

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
        expectedShift: expected,
        scannedShift: scanned,
        fullName,
        department: empDoc?.department || '',
        position:   empDoc?.position   || '',
        line:       empDoc?.line       || ''
      });
    }

    // VALIDATE only
    if (mode === 'validate') {
      return res.json({
        ok: true,
        nonWorkingDay: isNonWorking ? dayType : null,
        shiftMismatches: mismatches,
        totalRows: rows.length,
        preparedCount: prepared.length
      });
    }

    // Gates
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

    // COMMIT
    const summary = [];

    for (const p of prepared) {
      if (!p.employeeId) continue;

      const date    = startOfDayTZ(p.dateStr).toDate();
      const timeIn  = parseTimeToDateTZ(p.dateStr, p.startTime);
      const timeOut = parseTimeToDateTZ(p.dateStr, p.endTime);

      const isMismatch = p.expectedShift && p.scannedShift && p.expectedShift !== p.scannedShift;
      const finalShift = isMismatch
        ? (mismatchPolicy === 'scanned' ? p.scannedShift : p.expectedShift)
        : (p.expectedShift || p.scannedShift || 'Day Shift');

      const { status, overtimeMinutes } = evaluateStatus(p.startTime, p.endTime, finalShift);
      const overtimeHours = overtimeMinutes > 0 ? parseFloat((overtimeMinutes / 60).toFixed(2)) : 0;
      const finalStatus = (!p.startTime && !p.endTime && p.leaveType) ? 'Leave' : status;

      const updated = await Attendance.findOneAndUpdate(
        { employeeId: p.employeeId, date, company },
        {
          employeeId: p.employeeId,
          date,
          shiftType: finalShift,
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

      // Sync employee status on presence
      if (['OnTime','Late','Overtime'].includes(updated.status)) {
        await Employee.findOneAndUpdate(
          { employeeId: p.employeeId, company },
          { status: 'Working' }
        );
      }

      // Consecutive absence → risk flags
      if (updated.status === 'Absent') {
        const currentDate = new Date(updated.date);
        let consecutiveAbsent = 1;

        for (let i = 1; i <= 10; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(currentDate.getDate() - i);

          const prev = await Attendance.findOne({
            employeeId: p.employeeId,
            company,
            date: {
              $gte: new Date(prevDate.setHours(0,0,0,0)),
              $lt:  new Date(prevDate.setHours(23,59,59,999))
            },
          });
          if (prev?.status === 'Absent') consecutiveAbsent++; else break;
        }

        if (consecutiveAbsent >= 6) {
          const start = new Date(currentDate);
          start.setDate(currentDate.getDate() - 5);
          await Attendance.updateMany(
            { employeeId: p.employeeId, company, date: { $gte: start, $lte: currentDate }, status: 'Absent' },
            { riskStatus: 'Abandon' }
          );
          await Employee.findOneAndUpdate({ employeeId: p.employeeId, company }, { status: 'Abandon' });
        } else if (consecutiveAbsent >= 3) {
          const start = new Date(currentDate);
          start.setDate(currentDate.getDate() - (consecutiveAbsent - 1));
          await Attendance.updateMany(
            { employeeId: p.employeeId, company, date: { $gte: start, $lte: currentDate }, status: 'Absent' },
            { riskStatus: 'NearlyAbandon' }
          );
        }
      }

      // Comeback risk
      if (['OnTime', 'Late'].includes(updated.status)) {
        const currentDate = new Date(updated.date);
        let wasRisk = false;

        for (let i = 1; i <= 10; i++) {
          const prevDate = new Date(currentDate);
          prevDate.setDate(currentDate.getDate() - i);

          const prev = await Attendance.findOne({
            employeeId: p.employeeId,
            company,
            date: {
              $gte: new Date(prevDate.setHours(0,0,0,0)),
              $lt:  new Date(prevDate.setHours(23,59,59,999))
            },
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
        const emp = await Employee.findOne({ employeeId, company }).lean();
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
    const year  = Number.parseInt(req.query.year, 10);
    const month = Number.parseInt(req.query.month, 10);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: 'year and month are required (month 1..12)' });
    }

    const monthStr   = String(month).padStart(2, '0');
    const startLocal = dayjs.tz(`${year}-${monthStr}-01 00:00:00`, TZ).startOf('day');
    if (!startLocal.isValid()) {
      return res.status(400).json({ message: 'Invalid year/month after parsing' });
    }

    const endLocal = startLocal.add(1, 'month');
    const start = startLocal.toDate();
    const end   = endLocal.toDate();

    const att = await Attendance.aggregate([
      { $match: { company, date: { $gte: start, $lt: end } } },
      { $project: { d: { $dateTrunc: { date: "$date", unit: "day", timezone: TZ } } } },
      { $group: { _id: "$d", c: { $sum: 1 } } }
    ]);
    const attMap = new Map(att.map(a => [new Date(a._id).toISOString(), a.c]));

    const calDocs = await WorkCalendar.find({ company, date: { $gte: start, $lt: end } }).lean();
    const calMap = new Map(
      (calDocs || []).map(c => [
        dayjs.tz(c.date, TZ).startOf('day').toDate().toISOString(),
        c.dayType
      ])
    );

    const daysInMonth = startLocal.daysInMonth();
    const dots = [];
    for (let i = 0; i < daysInMonth; i++) {
      const dLocal = startLocal.add(i, 'day');
      const keyIso = dLocal.startOf('day').toDate().toISOString();
      const count  = attMap.get(keyIso) || 0;

      let status;
      const calType = calMap.get(keyIso) || null;
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
      .select('employeeId department position line').lean();
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
      .select('employeeId department position line').lean();
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
      .select('employeeId department position line').lean();
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
      const start = startOfDayTZ(date).toDate();
      const end   = startOfDayTZ(date).add(1, 'day').toDate();
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
      .select('employeeId englishFirstName englishLastName department position line').lean();

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
