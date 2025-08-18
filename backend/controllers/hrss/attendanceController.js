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

    // 🔔 unique-employee alert sets (count once per employee for this import)
    const alertNearly  = new Set();
    const alertRisk    = new Set();
    const alertAbandon = new Set();

    // helper: compute consecutive ABSENT streak ending at a given date (includes that date)
    async function consecutiveAbsentDays(employeeId, company, endDate /* Date */, lookback = 14) {
      let streak = 0;
      const end = new Date(endDate);
      for (let i = 0; i < lookback; i++) {
        const d0 = new Date(end);
        d0.setDate(end.getDate() - i);
        const dayStart = new Date(d0.setHours(0,0,0,0));
        const dayEnd   = new Date(d0.setHours(23,59,59,999));

        const rec = await Attendance.findOne({
          employeeId, company,
          date: { $gte: dayStart, $lte: dayEnd }
        }).lean();

        if (!rec) break;
        if (rec.status === 'Leave') break;    // Permission does not count
        if (rec.status !== 'Absent') break;   // any presence breaks the streak
        streak++;
      }
      return streak;
    }

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

      /* ───── Presence updates ───── */
      if (['OnTime','Late','Overtime'].includes(updated.status)) {
        await Employee.findOneAndUpdate(
          { employeeId: p.employeeId, company },
          { status: 'Working' }
        );
      }

      /* ─────────────── Correct risk logic ───────────────
         - 3 consecutive Absent → mark those records 'NearlyAbandon'
         - 6 consecutive Absent → mark those records 'Abandon' and Employee.status 'Abandon'
         - If the employee returns to work (OnTime/Late/Overtime) after a streak ≥3 → mark TODAY 'Risk'
         - 'Leave' does not count toward absence streaks
      */

      // Consecutive absence → risk flags (skip Sundays/Holidays)
      if (updated.status === 'Absent') {
        const currentDate = new Date(updated.date); // this day's date (already start of day in TZ)
        let consecutiveAbsent = 1;                  // today is absent
        let earliestWorkingAbsent = new Date(currentDate); // earliest working-day absent in the current streak

        // walk back through calendar days; ignore non‑working days completely
        for (let i = 1; i <= 14; i++) { // look back far enough to find up to 6 working absences
          const prevLocal = dayjs.tz(currentDate, TZ).subtract(i, 'day');
          const prevStart = prevLocal.startOf('day').toDate();
          const prevEnd   = prevLocal.endOf('day').toDate();

          // if non‑working (Sunday/Holiday) -> skip without breaking the streak
          const dayType = await getDayType(company, prevStart);
          if (dayType === 'Sunday' || dayType === 'Holiday') {
            continue;
          }

          // working day: check attendance
          const prev = await Attendance.findOne({
            employeeId: p.employeeId,
            company,
            date: { $gte: prevStart, $lt: prevEnd }
          });

          if (prev?.status === 'Absent') {
            consecutiveAbsent += 1;
            earliestWorkingAbsent = prevStart; // expand the streak window leftward
            if (consecutiveAbsent >= 6) break; // no need to keep walking for our thresholds
          } else {
            // any working day that is not Absent breaks the streak
            break;
          }
        }

        // Apply flags across the working-day streak window
        if (consecutiveAbsent >= 6) {
          await Attendance.updateMany(
            {
              employeeId: p.employeeId,
              company,
              date: { $gte: earliestWorkingAbsent, $lte: currentDate },
              status: 'Absent'
            },
            { riskStatus: 'Abandon' }
          );
          await Employee.findOneAndUpdate({ employeeId: p.employeeId, company }, { status: 'Abandon' });
        } else if (consecutiveAbsent >= 3) {
          await Attendance.updateMany(
            {
              employeeId: p.employeeId,
              company,
              date: { $gte: earliestWorkingAbsent, $lte: currentDate },
              status: 'Absent'
            },
            { riskStatus: 'NearlyAbandon' }
          );
        }
      }


      if (['OnTime', 'Late', 'Overtime'].includes(updated.status)) {
        // Coming back after ≥3-day absence streak? -> mark TODAY Risk
        let hadStreak = false;

        // quick peek for recent NearlyAbandon/Abandon in last 10 days
        for (let i = 1; i <= 10; i++) {
          const prevDate = new Date(updated.date);
          prevDate.setDate(updated.date.getDate() - i);

          const dayStart = new Date(prevDate.setHours(0,0,0,0));
          const dayEnd   = new Date(prevDate.setHours(23,59,59,999));

          const rec = await Attendance.findOne({
            employeeId: p.employeeId, company,
            date: { $gte: dayStart, $lte: dayEnd }
          }).lean();

          if (rec?.riskStatus === 'Abandon' || rec?.riskStatus === 'NearlyAbandon') {
            hadStreak = true;
            break;
          }
        }

        // if not found, compute real streak ending yesterday
        if (!hadStreak) {
          const y = new Date(updated.date);
          y.setDate(updated.date.getDate() - 1);
          const absStreak = await consecutiveAbsentDays(p.employeeId, company, y, 14);
          hadStreak = absStreak >= 3;
        }

        updated.riskStatus = hadStreak ? 'Risk' : 'None';
        await updated.save();

        if (hadStreak) alertRisk.add(p.employeeId);
      }

      if (updated.status === 'Leave') {
        // Leave day should not escalate; keep existing risk if already escalated
        updated.riskStatus = updated.riskStatus && updated.riskStatus !== 'None'
          ? updated.riskStatus
          : 'None';
        await updated.save();
      }

      summary.push({
        employeeId: p.employeeId,
        date: p.dateStr,
        status: updated.status,
        leaveType: updated.leaveType,
        overtimeHours: updated.overtimeHours,
        shiftType: updated.shiftType,
        riskStatus: updated.riskStatus
      });
    }

    return res.json({
      ok: true,
      message: `✅ Imported ${summary.length} attendance records.`,
      warnings: {
        nonWorkingDay: isNonWorking ? dayType : null,
        shiftMismatches: mismatches
      },
      alerts: {
        nearlyAbandonEmployees: alertNearly.size,
        riskEmployees:          alertRisk.size,
        abandonEmployees:       alertAbandon.size
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

// ───────────────────── Analytics (time series for charts) ─────────────────────
exports.getAttendanceSeries = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(400).json({ message: 'Missing company' });

    const scope = (req.query.scope || 'day').toLowerCase(); // 'day' | 'month' | 'year'
    const shiftType = req.query.shiftType && req.query.shiftType !== 'All' ? req.query.shiftType : null;

    // Inputs:
    // scope=day   -> date=YYYY-MM-DD (default: today)
    // scope=month -> year=YYYY & month=1..12 (default: current)
    // scope=year  -> year=YYYY (default: current)
    const todayLocal = dayjs.tz(dayjs(), TZ);
    let startLocal, endLocal, unit, labelFormat;

    if (scope === 'day') {
      const date = req.query.date || todayLocal.format('YYYY-MM-DD');
      startLocal = dayjs.tz(`${date} 00:00:00`, TZ).startOf('day');
      endLocal   = startLocal.add(1, 'day');
      unit = 'day';
      labelFormat = 'YYYY-MM-DD';
    } else if (scope === 'month') {
      const y = Number(req.query.year || todayLocal.year());
      const m = Number(req.query.month || (todayLocal.month() + 1)); // 1..12
      const mm = String(m).padStart(2, '0');
      startLocal = dayjs.tz(`${y}-${mm}-01 00:00:00`, TZ).startOf('month');
      endLocal   = startLocal.add(1, 'month');
      unit = 'day';            // daily buckets across the month
      labelFormat = 'YYYY-MM-DD';
    } else if (scope === 'year') {
      const y = Number(req.query.year || todayLocal.year());
      startLocal = dayjs.tz(`${y}-01-01 00:00:00`, TZ).startOf('year');
      endLocal   = startLocal.add(1, 'year');
      unit = 'month';          // monthly buckets across the year
      labelFormat = 'YYYY-MM';
    } else {
      return res.status(400).json({ message: "scope must be 'day' | 'month' | 'year'" });
    }

    const start = startLocal.toDate();
    const end   = endLocal.toDate();

    const match = { company, date: { $gte: start, $lt: end } };
    if (shiftType) match.shiftType = shiftType;

    // Map leave types to clean buckets (server-side, inside aggregation)
    const leaveBucketSwitch = {
      branches: [
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /sick/i } },       then: 'Sick Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /annual/i } },     then: 'Annual Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /maternity/i } },  then: 'Maternity Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /unpaid/i } },     then: 'Unpaid Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /spec?ial/i } },   then: 'Special Leave' }, // handles "Specail"
      ],
      default: 'Other'
    };

    const agg = await Attendance.aggregate([
      { $match: match },
      {
        $project: {
          bucket: { $dateTrunc: { date: '$date', unit, timezone: TZ } },
          status: { $ifNull: ['$status', 'None'] },
          risk:   { $ifNull: ['$riskStatus', 'None'] },
          leaveBucket: {
            $cond: [
              { $eq: ['$status', 'Leave'] },
              { $switch: leaveBucketSwitch },
              null
            ]
          }
        }
      },
      {
        $group: {
          _id: '$bucket',

          // Attendance outcome
          OnTime: { $sum: { $cond: [{ $eq: ['$status', 'OnTime'] }, 1, 0] } },
          Late:   { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          Absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          Leave:  { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
          NoneStatus: { $sum: { $cond: [{ $eq: ['$status', 'None'] }, 1, 0] } },

          // Risk flags
          RiskNearlyAbandon: { $sum: { $cond: [{ $eq: ['$risk', 'NearlyAbandon'] }, 1, 0] } },
          RiskAbandon:       { $sum: { $cond: [{ $eq: ['$risk', 'Abandon'] }, 1, 0] } },
          RiskRisk:          { $sum: { $cond: [{ $eq: ['$risk', 'Risk'] }, 1, 0] } },
          RiskNone:          { $sum: { $cond: [{ $eq: ['$risk', 'None'] }, 1, 0] } },

          // Leave breakdown
          LeaveSick:      { $sum: { $cond: [{ $eq: ['$leaveBucket', 'Sick Leave'] }, 1, 0] } },
          LeaveAnnual:    { $sum: { $cond: [{ $eq: ['$leaveBucket', 'Annual Leave'] }, 1, 0] } },
          LeaveMaternity: { $sum: { $cond: [{ $eq: ['$leaveBucket', 'Maternity Leave'] }, 1, 0] } },
          LeaveUnpaid:    { $sum: { $cond: [{ $eq: ['$leaveBucket', 'Unpaid Leave'] }, 1, 0] } },
          LeaveSpecial:   { $sum: { $cond: [{ $eq: ['$leaveBucket', 'Special Leave'] }, 1, 0] } },
          LeaveOther:     { $sum: { $cond: [{ $eq: ['$leaveBucket', 'Other'] }, 1, 0] } },
        }
      },
      { $sort: { _id: 1 } },
    ]);

    // Build dense timeline with zeros for missing buckets
    const zeroRow = () => ({
      // outcome
      OnTime: 0, Late: 0, Absent: 0, Leave: 0, NoneStatus: 0,
      // risk
      RiskNearlyAbandon: 0, RiskAbandon: 0, RiskRisk: 0, RiskNone: 0,
      // leaves
      LeaveSick: 0, LeaveAnnual: 0, LeaveMaternity: 0, LeaveUnpaid: 0, LeaveSpecial: 0, LeaveOther: 0,
    });

    // map from ISO date string to row
    const map = new Map(
      agg.map(r => [new Date(r._id).toISOString(), r])
    );

    const buckets = [];
    let cursor = startLocal.clone();
    const step = unit === 'day' ? { n: 1, u: 'day' } : unit === 'month' ? { n: 1, u: 'month' } : { n: 1, u: 'year' };

    while (cursor.isBefore(endLocal)) {
      const keyISO = cursor.startOf(unit).toDate().toISOString();
      const found = map.get(keyISO);
      const label = cursor.format(labelFormat);

      buckets.push({
        key: label,
        status: {
          OnTime: found?.OnTime || 0,
          Late: found?.Late || 0,
          Absent: found?.Absent || 0,
          Leave: found?.Leave || 0,
          None: found?.NoneStatus || 0,
        },
        risk: {
          NearlyAbandon: found?.RiskNearlyAbandon || 0,
          Abandon: found?.RiskAbandon || 0,
          Risk: found?.RiskRisk || 0,
          None: found?.RiskNone || 0,
        },
        leaves: {
          'Sick Leave': found?.LeaveSick || 0,
          'Annual Leave': found?.LeaveAnnual || 0,
          'Maternity Leave': found?.LeaveMaternity || 0,
          'Unpaid Leave': found?.LeaveUnpaid || 0,
          'Special Leave': found?.LeaveSpecial || 0,
          'Other': found?.LeaveOther || 0,
        }
      });

      cursor = cursor.add(step.n, step.u);
    }

    // Totals (handy for small KPI chips)
    const totals = buckets.reduce((acc, b) => {
      for (const [k, v] of Object.entries(b.status)) acc.status[k] += v;
      for (const [k, v] of Object.entries(b.risk))   acc.risk[k]   += v;
      for (const [k, v] of Object.entries(b.leaves)) acc.leaves[k] += v;
      return acc;
    }, {
      status: { OnTime:0, Late:0, Absent:0, Leave:0, None:0 },
      risk:   { NearlyAbandon:0, Abandon:0, Risk:0, None:0 },
      leaves: { 'Sick Leave':0, 'Annual Leave':0, 'Maternity Leave':0, 'Unpaid Leave':0, 'Special Leave':0, 'Other':0 }
    });

    return res.json({
      ok: true,
      scope,
      unit,
      tz: TZ,
      start: startLocal.format('YYYY-MM-DD'),
      end: endLocal.subtract(1, unit).format(labelFormat),
      buckets,
      totals
    });
  } catch (err) {
    console.error('❌ getAttendanceSeries error:', err);
    res.status(500).json({ message: 'Analytics series failed', error: err.message });
  }
};
