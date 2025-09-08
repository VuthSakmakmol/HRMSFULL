// controllers/hrss/attendanceController.js
const Attendance     = require('../../models/hrss/attendances');
const Employee       = require('../../models/hrss/employee');
const WorkCalendar   = require('../../models/hrss/workCalendar');
const ShiftTemplate  = require('../../models/hrss/shiftTemplate');
const XLSX           = require('xlsx');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
const TZ = 'Asia/Phnom_Penh';

/* ───────────────────────── helpers ───────────────────────── */
// Robust "time string" -> minutes since 00:00 (supports "12:00 PM", "11am", "7", "07:30")
const toMinutes = (time) => {
  if (time == null || time === '') return null; // keep null to detect "no scan"
  if (typeof time === 'number' && isFinite(time)) return Math.max(0, Math.floor(time));

  let s = String(time).trim().toLowerCase().replace(/\s+/g, ''); // "12:00 PM" -> "12:00pm"
  const isPM = /pm$/.test(s);
  const isAM = /am$/.test(s);
  if (isPM || isAM) s = s.replace(/(am|pm)$/, '');

  const parts = s.split(':');
  let h = Number(parts[0] || 0);
  let m = Number(parts[1] || 0);
  if (!isFinite(h)) h = 0;
  if (!isFinite(m)) m = 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
};

const startOfDayTZ = (dLike) => dayjs.tz(dLike, TZ).startOf('day');

const parseTimeToDateTZ = (baseDateStr, timeStr) => {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  return dayjs.tz(baseDateStr, TZ).hour(h || 0).minute(m || 0).second(0).millisecond(0).toDate();
};

/**
 * Accept many date formats & Excel serials and return "YYYY-MM-DD" or null.
 */
const formatExcelDate = (value) => {
  if (value == null || value === '') return null;

  // Excel serial (incl. fractional time) -> date part only
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

  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return null;
    s = s.replace(/[./\\\s]+/g, '-');

    // YYYY-MM-DD or YYYY-M-D
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return null;
    }

    // DD-MM-YYYY or D-M-YYYY
    m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) {
      const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      return null;
    }

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

const getDayType = async (company, dateOnly) => {
  const d0 = startOfDayTZ(dateOnly).toDate();
  const cal = await WorkCalendar.findOne({ company, date: d0 }).lean();
  if (cal?.dayType) return cal.dayType;
  const dow = dayjs.tz(d0, TZ).day(); // 0=Sunday
  return dow === 0 ? 'Sunday' : 'Working';
};

/* ───────── Strict windows to decide if scans plausibly belong to a shift (LEGACY) ───────── */
const scansMatchShift = (startTime, endTime, shiftType) => {
  const sm = toMinutes(startTime);
  const em = toMinutes(endTime);

  // if no scans, we don't call it a mismatch here (caller decides Absent/Leave)
  if (sm == null && em == null) return true;

  if (shiftType === 'Day Shift') {
    // Day-like scans: starts between 05:00–15:59; any end up to 23:59 is OK
    if (sm != null && (sm < toMinutes('05:00') || sm >= toMinutes('16:00'))) return false;
    if (em != null && em < toMinutes('00:00')) return false; // impossible anyway
    return true;
  }

  if (shiftType === 'Night Shift') {
    // Night-like scans: start 16:00–23:59 or 00:00–02:59 (some devices post-midnight)
    if (sm != null) {
      const nightStart = (sm >= toMinutes('16:00') && sm <= toMinutes('23:59')) || (sm >= 0 && sm < toMinutes('03:00'));
      if (!nightStart) return false;
    }
    return true;
  }

  return false;
};

/* ───────── LEGACY lateness & overtime (break-aware, strict by shift) ───────── */
const evaluateStatus = (startTime, endTime, shiftType) => {
  // No scans at all
  if (!startTime && !endTime) return { status: 'Absent', overtimeMinutes: 0, lateMinutes: 0 };

  // If scans obviously don't belong to this shift window -> Absent
  if (!scansMatchShift(startTime, endTime, shiftType)) {
    return { status: 'Absent', overtimeMinutes: 0, lateMinutes: 0 };
  }

  let startMin = toMinutes(startTime);
  let endMin   = toMinutes(endTime);
  let overtimeMinutes = 0;
  let lateMinutes = 0;

  if (shiftType === 'Day Shift') {
    const S = toMinutes('07:00');
    const E = toMinutes('16:00');
    const B1 = toMinutes('11:00');
    const B2 = toMinutes('12:00');
    const BLK = B2 - B1; // 60

    if (startMin == null || endMin == null) return { status: 'Absent', overtimeMinutes: 0, lateMinutes: 0 };

    if (startMin <= S) {
      lateMinutes = 0;
    } else if (startMin <= B1) {
      lateMinutes = startMin - S;               // before break
    } else if (startMin < B2) {
      lateMinutes = B1 - S;                     // during break -> cap at morning max
    } else {
      lateMinutes = (startMin - S) - BLK;       // after break -> subtract 60
    }

    const late = lateMinutes > 15;              // 15' grace
    if (endMin > E + 1) overtimeMinutes = endMin - (E + 1);

    return { status: late ? 'Late' : 'OnTime', overtimeMinutes, lateMinutes };
  }

  if (shiftType === 'Night Shift') {
    const S   = toMinutes('18:00');
    const E   = toMinutes('03:00');
    const B1  = toMinutes('22:00');
    const B2  = toMinutes('23:00');
    const BLK = B2 - B1; // 60

    if (startMin == null || endMin == null) return { status: 'Absent', overtimeMinutes: 0, lateMinutes: 0 };

    // roll post-midnight only
    const MID_CUTOFF = toMinutes('06:00');
    if (startMin < MID_CUTOFF) startMin += 1440;
    if (endMin   < startMin)   endMin   += 1440;

    const E_norm = (endMin >= 1440) ? (E + 1440) : E;

    if (startMin <= S) {
      lateMinutes = 0;
    } else if (startMin <= B1) {
      lateMinutes = startMin - S;
    } else if (startMin < B2) {
      lateMinutes = B1 - S;
    } else {
      lateMinutes = (startMin - S) - BLK;
    }

    const late = lateMinutes > 15;

    if (endMin > E_norm + 1) overtimeMinutes = endMin - (E_norm + 1);

    return { status: late ? 'Late' : 'OnTime', overtimeMinutes, lateMinutes };
  }

  return { status: 'Absent', overtimeMinutes: 0, lateMinutes: 0 };
};

/* ───────────────────── Template-based evaluator (NEW) ───────────────────── */
const isHHMM = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(s);
const hhmmToMin = (s) => {
  if (!isHHMM(s)) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

function subtractUnpaidBreaks(totalMinutes, inMin, outMin, breaks = [], allowCrossMidnight = false) {
  if (inMin == null || outMin == null || outMin < inMin) return totalMinutes;
  let worked = totalMinutes;
  for (const b of breaks) {
    const bs = hhmmToMin(b.start);
    const be = hhmmToMin(b.end);
    if (bs == null || be == null || be <= bs) continue;

    // map break to the same "day frame" as in/out; if cross-midnight and bs<inMin, shift by +1440
    let bStart = bs;
    let bEnd   = be;
    if (allowCrossMidnight && bStart < inMin) {
      bStart += 1440; bEnd += 1440;
    }
    const overlap = Math.max(0, Math.min(outMin, bEnd) - Math.max(inMin, bStart));
    if (!b.paid && overlap > 0) worked -= overlap;
  }
  return worked;
}
function applyRounding(minutes, roundingMin = 0) {
  if (!roundingMin || roundingMin <= 0) return minutes;
  return Math.floor(minutes / roundingMin) * roundingMin;
}

function evaluateWithTemplate(template, startTime, endTime) {
  const flags = [];
  if (!template) return { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0, flags, snapshot: null };

  const allowX = !!template.window?.allowCrossMidnight;

  // expected windows
  const tIn  = hhmmToMin(template.timeIn);
  const tOut = hhmmToMin(template.timeOut);
  const lateAfter = hhmmToMin(template.lateAfter);
  if (tIn == null || tOut == null || lateAfter == null) {
    return { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0, flags, snapshot: null };
  }

  // scans -> minutes in the same frame as expected times
  let inMin  = toMinutes(startTime);
  let outMin = toMinutes(endTime);

  if (inMin == null && outMin == null) {
    return { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0, flags, snapshot: template };
  }

  // allow post-midnight roll only when flagged
  const MID_CUTOFF = toMinutes('06:00');
  if (allowX) {
    if (inMin != null && inMin < MID_CUTOFF) inMin += 1440;
    if (outMin != null && outMin < (inMin ?? tIn)) outMin += 1440;
  }

  // optional scan-window guard
  if (template.window) {
    const ei = template.window.earliestIn  ? hhmmToMin(template.window.earliestIn)  : null;
    const li = template.window.latestIn    ? hhmmToMin(template.window.latestIn)    : null;
    const eo = template.window.earliestOut ? hhmmToMin(template.window.earliestOut) : null;
    const lo = template.window.latestOut   ? hhmmToMin(template.window.latestOut)   : null;

    const _in  = inMin  == null ? null : (inMin % 1440);
    const _out = outMin == null ? null : (outMin % 1440);

    if (ei != null && _in != null && _in < ei) flags.push('SCAN_BEFORE_EARLIEST_IN');
    if (li != null && _in != null && _in > li) flags.push('SCAN_AFTER_LATEST_IN');
    if (eo != null && _out != null && _out < eo) flags.push('SCAN_BEFORE_EARLIEST_OUT');
    if (lo != null && _out != null && _out > lo) flags.push('SCAN_AFTER_LATEST_OUT');
    if (allowX) flags.push('CROSS_MIDNIGHT_APPLIED');
  }

  // LATE: starts after 'lateAfter'
  let lateMinutes = 0;
  if (inMin != null && inMin > lateAfter) lateMinutes = inMin - lateAfter;

  // WORKED
  let worked = 0;
  if (inMin != null && outMin != null && outMin > inMin) {
    worked = outMin - inMin;
    worked = subtractUnpaidBreaks(worked, inMin, outMin, template.breaks || [], allowX);
  }

  // OVERTIME
  let overtimeMinutes = 0;
  if (outMin != null) {
    const expOut = allowX && tOut < tIn ? tOut + 1440 : tOut;
    const beyond = outMin - expOut;
    if (beyond > 0) {
      const ot = template.ot || { mode: 'DISABLED' };
      if (ot.mode === 'ANY_MINUTES') {
        const afterGrace = Math.max(0, beyond - (ot.startAfterMin || 0));
        overtimeMinutes = applyRounding(afterGrace, ot.roundingMin || 0);
      } else if (ot.mode === 'TIERS') {
        const tiers = Array.isArray(ot.tiers) ? ot.tiers : [];
        const afterGrace = Math.max(0, beyond - (ot.startAfterMin || 0));
        const eligible = tiers.filter(x => x <= afterGrace).sort((a,b)=>a-b);
        overtimeMinutes = eligible.length ? eligible[eligible.length - 1] : 0;
      }
    }
  }

  const status = (inMin == null || outMin == null)
    ? 'Absent'
    : (lateMinutes > 0 ? 'Late' : 'OnTime');

  return {
    status,
    lateMinutes,
    overtimeMinutes,
    flags,
    snapshot: {
      version: template.version || 1,
      name: template.name || '',
      timeIn: template.timeIn,
      lateAfter: template.lateAfter,
      timeOut: template.timeOut,
      breaks: template.breaks || [],
      window: template.window || undefined,
      ot: template.ot || undefined
    }
  };
}

/* ────────── resolve template from employee.shiftTemplateId (no ShiftAssignment) ────────── */
async function getEmployeeTemplate(company, employeeId) {
  const emp = await Employee.findOne({ company, employeeId })
    .select('shiftTemplateId shift shiftName')
    .lean();
  if (!emp?.shiftTemplateId) return null;
  const tpl = await ShiftTemplate.findOne({ _id: emp.shiftTemplateId, company, active: true }).lean();
  return tpl || null;
}

/* ───────────────────── Import attendance (validate/commit) ─────────────────────
Body:
{
  mode?: 'validate' | 'commit'      // default 'commit'
  allowNonWorking?: boolean         // default false
  rows: [{ employeeId?, fullName?, date, startTime, endTime, leaveType? }]
}
*/
exports.importAttendance = async (req, res) => {
  try {
    const {
      mode = 'commit',
      allowNonWorking = false,
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

    /* ───────── Employee caches (NO defaultShift guessing) ───────── */
    const idsRaw   = [...new Set(rows.map(r => (r.employeeId || '').trim()).filter(Boolean))];
    const idsQuery = [...new Set([...idsRaw, ...idsRaw.map(s => s.toUpperCase())])];

    const empsById = {};
    if (idsQuery.length) {
      const empDocs = await Employee.find({ company, employeeId: { $in: idsQuery } })
        .select('employeeId englishFirstName englishLastName department position line shift shiftName')
        .lean();

      for (const e of empDocs) {
        const key = e.employeeId.trim().toUpperCase();
        const empShift = normalizeShift(e.shift) || normalizeShift(e.shiftName) || null;
        empsById[key] = { ...e, __empShift: empShift };
      }
    }

    const needNameLookup = rows.some(r => !r.employeeId && r.fullName);
    const empsByName = {};
    if (needNameLookup) {
      const allDocs = await Employee.find({ company })
        .select('employeeId englishFirstName englishLastName department position line shift shiftName')
        .lean();

      for (const e of allDocs) {
        const key = `${(e.englishFirstName||'').trim()} ${(e.englishLastName||'').trim()}`.trim().toLowerCase();
        const empShift = normalizeShift(e.shift) || normalizeShift(e.shiftName) || null;
        if (key) empsByName[key] = { ...e, __empShift: empShift };
      }
    }

    /* ───────── Build prepared rows & collect errors ───────── */
    const prepared = [];
    const missingEmployee = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const rowNo = idx + 1;

      const employeeIdRaw = (r.employeeId || '').trim();
      const idKey         = employeeIdRaw.toUpperCase();
      const dateStr       = formatExcelDate(r.date);
      if (!dateStr) continue;

      const startTime = (r.startTime || '').trim();
      const endTime   = (r.endTime   || '').trim();
      const leaveType = (r.leaveType || '').trim() || null;

      // Lookup by ID first (uppercased), else by full name
      let empDoc = employeeIdRaw ? empsById[idKey] : null;
      if (!empDoc && r.fullName) {
        const key = String(r.fullName).trim().toLowerCase();
        empDoc = empsByName[key] || null;
        if (empDoc?.employeeId) {
          const injectKey = empDoc.employeeId.trim().toUpperCase();
          if (!empsById[injectKey]) empsById[injectKey] = empDoc;
        }
      }

      const resolvedId = employeeIdRaw || (empDoc?.employeeId || '');
      const fullName   = empDoc
        ? `${empDoc.englishFirstName || ''} ${empDoc.englishLastName || ''}`.trim()
        : (r.fullName || 'Unknown');

      if (!empDoc) {
        missingEmployee.push({
          row: rowNo,
          employeeId: resolvedId || '-',
          fullName,
          reason: 'Employee not found'
        });
      }

      prepared.push({
        employeeId: resolvedId,
        dateStr, startTime, endTime, leaveType,
        expectedShift: empDoc ? (empDoc.__empShift || null) : null, // legacy only
        fullName,
        department: empDoc?.department || '',
        position:   empDoc?.position   || '',
        line:       empDoc?.line       || ''
      });
    }

    // VALIDATE mode: block on missing employee; ensure employee has a shiftTemplateId
    if (mode === 'validate') {
      const noTemplate = [];
      for (const p of prepared) {
        if (!p.employeeId) continue;
        const tmpl = await getEmployeeTemplate(company, p.employeeId);
        if (!tmpl) {
          noTemplate.push({ employeeId: p.employeeId, date: p.dateStr, reason: 'No shift template assigned on employee' });
        }
      }

      if (missingEmployee.length || noTemplate.length) {
        const preview = [
          ...missingEmployee.map(m => `Row ${m.row} (${m.employeeId} - ${m.fullName}): ${m.reason}`),
          ...noTemplate.slice(0, 5).map(m => `(${m.employeeId} @ ${m.date}): ${m.reason}`)
        ].join('; ');
        const more = noTemplate.length > 5 ? ` …and ${noTemplate.length - 5} more without template` : '';
        return res.status(422).json({
          ok: false,
          reason: missingEmployee.length ? 'MISSING_EMPLOYEE' : 'MISSING_SHIFT_TEMPLATE',
          message: `Cannot import: ${preview}${more}`,
          details: { missingEmployee, noTemplate },
          nonWorkingDay: isNonWorking ? dayType : null
        });
      }

      return res.json({
        ok: true,
        nonWorkingDay: isNonWorking ? dayType : null,
        totalRows: rows.length,
        preparedCount: prepared.length
      });
    }

    /* ───────── COMMIT gates ───────── */
    if (isNonWorking && !allowNonWorking) {
      return res.status(409).json({
        ok: false,
        reason: 'NON_WORKING_DAY',
        dayType,
        message: `This date (${firstValidDateStr}) is ${dayType}. Change calendar or allow override.`
      });
    }

    if (missingEmployee.length) {
      const preview = missingEmployee.slice(0, 8)
        .map(m => `Row ${m.row} (${m.employeeId} - ${m.fullName}): ${m.reason}`)
        .join('; ');
      const more = missingEmployee.length > 8
        ? ` …and ${missingEmployee.length - 8} more`
        : '';
      return res.status(409).json({
        ok: false,
        reason: 'MISSING_EMPLOYEE',
        message: `Cannot import: ${preview}${more}`,
        details: { missingEmployee }
      });
    }

    /* ───────── COMMIT ───────── */
    const summary = [];

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

      // LEGACY cache: employee shift (used only for fallback)
      const empFromCache = empsById[(p.employeeId || '').trim().toUpperCase()];
      const finalShift   = empFromCache?.__empShift || null; // normalized or null

      // NEW: resolve template from Employee.shiftTemplateId
      const tmpl = await getEmployeeTemplate(company, p.employeeId);

      // Evaluate
      let computedStatus, overtimeMinutes, lateMinutes, flags = [], shiftTemplateId = null, shiftName = '', shiftSnapshot = undefined;

      if (!p.startTime && !p.endTime && p.leaveType) {
        // Leave override
        computedStatus = 'Leave';
        overtimeMinutes = 0;
        lateMinutes = 0;
      } else if (tmpl) {
        const ev = evaluateWithTemplate(tmpl, p.startTime, p.endTime);
        computedStatus  = ev.status;
        overtimeMinutes = ev.overtimeMinutes;
        lateMinutes     = ev.lateMinutes;
        flags           = ev.flags || [];
        shiftTemplateId = tmpl._id;
        shiftName       = tmpl.name || '';
        shiftSnapshot   = ev.snapshot;
      } else {
        // Fallback to legacy evaluator if no template yet
        const ev = evaluateStatus(p.startTime, p.endTime, finalShift || 'Day Shift');
        computedStatus  = ev.status;
        overtimeMinutes = ev.overtimeMinutes;
        lateMinutes     = ev.lateMinutes;
      }

      const overtimeHours = overtimeMinutes > 0 ? parseFloat((overtimeMinutes / 60).toFixed(2)) : 0;

      const updated = await Attendance.findOneAndUpdate(
        { employeeId: p.employeeId, date, company },
        {
          employeeId: p.employeeId,
          date,

          // legacy field preserved for compatibility (remove later)
          shiftType: finalShift || (shiftName ? shiftName : 'Day Shift'),

          // NEW template metadata
          shiftTemplateId,
          shiftName,
          shiftSnapshot,

          timeIn,
          timeOut,
          status: computedStatus,
          leaveType: computedStatus === 'Leave' ? p.leaveType : null,
          overtimeHours,
          lateMinutes,                 // lateness after configured rules
          riskStatus: 'None',
          fullName: p.fullName || 'Unknown',
          company,
          department: p.department,
          position:   p.position,
          line:       p.line,
          note: (p.note || ''),
          flags
        },
        { upsert: true, new: true }
      );

      // Presence update
      if (['OnTime','Late'].includes(updated.status)) {
        await Employee.findOneAndUpdate(
          { employeeId: p.employeeId, company },
          { status: 'Working' }
        );
      }

      /* ───────────── Risk logic (unchanged) ───────────── */
      if (updated.status === 'Absent') {
        const currentDate = new Date(updated.date);
        let consecutiveAbsent = 1;
        let earliestWorkingAbsent = new Date(currentDate);

        for (let i = 1; i <= 14; i++) {
          const prevLocal = dayjs.tz(currentDate, TZ).subtract(i, 'day');
          const prevStart = prevLocal.startOf('day').toDate();
          const prevEnd   = prevLocal.endOf('day').toDate();

          const prevType = await getDayType(company, prevStart);
          if (prevType === 'Sunday' || prevType === 'Holiday') {
            continue; // skip non-working days entirely
          }

          const prev = await Attendance.findOne({
            employeeId: p.employeeId, company,
            date: { $gte: prevStart, $lt: prevEnd }
          });

          if (prev?.status === 'Absent') {
            consecutiveAbsent += 1;
            earliestWorkingAbsent = prevStart;
            if (consecutiveAbsent >= 6) break;
          } else {
            break;
          }
        }

        if (consecutiveAbsent >= 6) {
          await Attendance.updateMany(
            { employeeId: p.employeeId, company, date: { $gte: earliestWorkingAbsent, $lte: currentDate }, status: 'Absent' },
            { riskStatus: 'Abandon' }
          );
          await Employee.findOneAndUpdate({ employeeId: p.employeeId, company }, { status: 'Abandon' });
        } else if (consecutiveAbsent >= 3) {
          await Attendance.updateMany(
            { employeeId: p.employeeId, company, date: { $gte: earliestWorkingAbsent, $lte: currentDate }, status: 'Absent' },
            { riskStatus: 'NearlyAbandon' }
          );
        }
      }

      if (['OnTime', 'Late'].includes(updated.status)) {
        // Coming back after ≥3-day absence streak? -> mark TODAY Risk
        let hadStreak = false;

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

        if (!hadStreak) {
          const y = new Date(updated.date);
          y.setDate(updated.date.getDate() - 1);
          const absStreak = await consecutiveAbsentDays(p.employeeId, company, y, 14);
          hadStreak = absStreak >= 3;
        }

        updated.riskStatus = hadStreak ? 'Risk' : 'None';
        await updated.save();
      }

      if (updated.status === 'Leave') {
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
        lateMinutes: updated.lateMinutes,
        shiftType: updated.shiftType,
        shiftTemplateId: updated.shiftTemplateId,
        shiftName: updated.shiftName,
        riskStatus: updated.riskStatus,
        flags: updated.flags || []
      });
    }

    return res.json({
      ok: true,
      message: `✅ Imported ${summary.length} attendance records.`,
      warnings: {
        nonWorkingDay: isNonWorking ? dayType : null
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
      const leaveType  = row.leaveType?.trim();
      const formattedDateStr = formatExcelDate(row.date);
      if (!employeeId || !leaveType || !formattedDateStr) continue;

      const date = startOfDayTZ(formattedDateStr).toDate();
      const tmpl = await getEmployeeTemplate(company, employeeId); // ← no ShiftAssignment

      // Enforce employee-configured legacy shift only for fallback snapshot
      const emp = await Employee.findOne({ employeeId, company })
        .select('englishFirstName englishLastName shift shiftName')
        .lean();
      const empShift = normalizeShift(emp?.shift) || normalizeShift(emp?.shiftName) || null;
      const shiftType = empShift || 'Day Shift';

      const existing = await Attendance.findOne({ employeeId, company, date });

      if (existing) {
        existing.status = 'Leave';
        existing.leaveType = leaveType;

        // attach template metadata if available
        if (tmpl) {
          existing.shiftTemplateId = tmpl._id;
          existing.shiftName = tmpl.name || '';
          existing.shiftSnapshot = {
            version: tmpl.version || 1,
            name: tmpl.name || '',
            timeIn: tmpl.timeIn, lateAfter: tmpl.lateAfter, timeOut: tmpl.timeOut,
            breaks: tmpl.breaks || [], window: tmpl.window || undefined, ot: tmpl.ot || undefined
          };
        } else {
          existing.shiftType = shiftType;
        }

        await existing.save();
        result.push({ employeeId, date: formattedDateStr, updated: true });
      } else {
        const fullName = emp ? `${emp.englishFirstName || ''} ${emp.englishLastName || ''}`.trim() : 'Unknown';
        const newLeave = new Attendance({
          employeeId, date,
          status: 'Leave',
          leaveType,
          company,
          fullName,
          // legacy snapshot
          shiftType
        });
        if (tmpl) {
          newLeave.shiftTemplateId = tmpl._id;
          newLeave.shiftName = tmpl.name || '';
          newLeave.shiftSnapshot = {
            version: tmpl.version || 1,
            name: tmpl.name || '',
            timeIn: tmpl.timeIn, lateAfter: tmpl.lateAfter, timeOut: tmpl.timeOut,
            breaks: tmpl.breaks || [], window: tmpl.window || undefined, ot: tmpl.ot || undefined
          };
        }
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

    // ── Build query ────────────────────────────────────────────────────────────
    const {
      shiftTemplateId,
      shiftName,
      employeeId,
      department,
      position,
      line,
      status,
      riskStatus,
      date,          // single day (YYYY-MM-DD)
      dateFrom,      // inclusive (YYYY-MM-DD)
      dateTo         // inclusive (YYYY-MM-DD)
    } = req.query || {};

    const query = { company };

    // date filters
    if (date) {
      const start = startOfDayTZ(date).toDate();
      const end   = startOfDayTZ(date).add(1, 'day').toDate();
      query.date = { $gte: start, $lt: end };
    } else if (dateFrom || dateTo) {
      const start = dateFrom ? startOfDayTZ(dateFrom).toDate() : new Date('1970-01-01T00:00:00Z');
      // end is exclusive, so add 1 day to dateTo
      const end   = dateTo ? startOfDayTZ(dateTo).add(1, 'day').toDate() : new Date('2999-12-31T00:00:00Z');
      query.date = { $gte: start, $lt: end };
    }

    // shift filters
    if (shiftTemplateId) {
      const { Types } = require('mongoose');
      if (Types.ObjectId.isValid(shiftTemplateId)) {
        query.shiftTemplateId = shiftTemplateId;
      } else {
        return res.status(400).json({ message: 'Invalid shiftTemplateId' });
      }
    }
    if (shiftName) {
      // Match either new snapshot name or (legacy) shiftType string
      query.$or = [
        { shiftName: { $regex: `^${shiftName}$`, $options: 'i' } },
        { shiftType: { $regex: `^${shiftName}$`, $options: 'i' } }  // legacy fallback
      ];
    }

    // other filters
    if (employeeId) query.employeeId = employeeId;
    if (status)     query.status = status;
    if (riskStatus) query.riskStatus = riskStatus;

    // org filters (we enrich these, but also store on Attendance now — so filter directly)
    if (department) query.department = department;
    if (position)   query.position   = position;
    if (line)       query.line       = line;

    // ── Fetch & enrich ────────────────────────────────────────────────────────
    const records = await Attendance.find(query).sort({ date: -1 });

    // enrich with employee org data (fallbacks)
    const employeeIds = [...new Set(records.map(r => r.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds }, company })
      .select('employeeId department position line').lean();

    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.employeeId] = {
        department: emp.department || '',
        position:   emp.position   || '',
        line:       emp.line       || ''
      };
    });

    const enriched = records.map(record => {
      const empInfo = employeeMap[record.employeeId] || {};
      return {
        ...record.toObject(),
        department: record.department || empInfo.department || '-',
        position:   record.position   || empInfo.position   || '-',
        line:       record.line       || empInfo.line       || '-'
      };
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
    const company = req.company;
    const {
      page = 1,
      limit = 50,
      date,           // single day (YYYY-MM-DD)
      dateFrom,       // inclusive (YYYY-MM-DD)
      dateTo,         // inclusive (YYYY-MM-DD)
      shiftTemplateId,
      shiftName,
      employeeId,
      department,
      position,
      line,
      status,
      riskStatus
    } = req.query || {};

    const parsedLimit = limit === 'All' ? 0 : Number(limit);
    const skip = (page - 1) * (parsedLimit || 0);

    // ── Build query ────────────────────────────────────────────────────────────
    const query = { company };

    // date filters
    if (date) {
      const start = startOfDayTZ(date).toDate();
      const end   = startOfDayTZ(date).add(1, 'day').toDate();
      query.date = { $gte: start, $lt: end };
    } else if (dateFrom || dateTo) {
      const start = dateFrom ? startOfDayTZ(dateFrom).toDate() : new Date('1970-01-01T00:00:00Z');
      const end   = dateTo ? startOfDayTZ(dateTo).add(1, 'day').toDate() : new Date('2999-12-31T00:00:00Z');
      query.date = { $gte: start, $lt: end };
    }

    // shift filters
    if (shiftTemplateId) {
      const { Types } = require('mongoose');
      if (Types.ObjectId.isValid(shiftTemplateId)) {
        query.shiftTemplateId = shiftTemplateId;
      } else {
        return res.status(400).json({ message: 'Invalid shiftTemplateId' });
      }
    }
    if (shiftName) {
      query.$or = [
        { shiftName: { $regex: `^${shiftName}$`, $options: 'i' } },
        { shiftType: { $regex: `^${shiftName}$`, $options: 'i' } }
      ];
    }

    // other filters
    if (employeeId) query.employeeId = employeeId;
    if (status)     query.status = status;
    if (riskStatus) query.riskStatus = riskStatus;

    // org filters
    if (department) query.department = department;
    if (position)   query.position   = position;
    if (line)       query.line       = line;

    // ── Query with pagination ─────────────────────────────────────────────────
    const attendanceQuery = Attendance.find(query).sort({ date: -1 });
    if (parsedLimit > 0) attendanceQuery.skip(skip).limit(parsedLimit);

    const [records, total] = await Promise.all([
      attendanceQuery.exec(),
      Attendance.countDocuments(query)
    ]);

    // ── Enrich with employee info (fullName + org fallback) ───────────────────
    const employeeIds = [...new Set(records.map(r => r.employeeId?.trim().toUpperCase()).filter(Boolean))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds }, company })
      .select('employeeId englishFirstName englishLastName department position line').lean();

    const employeeMap = {};
    employees.forEach(emp => {
      const key = emp.employeeId.trim().toUpperCase();
      employeeMap[key] = {
        fullName: `${emp.englishFirstName || ''} ${emp.englishLastName || ''}`.trim(),
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
        fullName: empInfo.fullName || record.fullName || 'Unknown',
        department: record.department || empInfo.department || '-',
        position:   record.position   || empInfo.position   || '-',
        line:       record.line       || empInfo.line       || '-'
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
  } catch (err) {
    console.error('❌ Delete error:', err.message);
    return res.status(500).json({ message: 'Delete failed', error: err.message });
  }
  return res.json({ message: '✅ Deleted' });
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

    const todayLocal = dayjs.tz(dayjs(), TZ);
    let startLocal, endLocal, unit;

    if (scope === 'day') {
      const date = req.query.date || todayLocal.format('YYYY-MM-DD');
      startLocal = dayjs.tz(`${date} 00:00:00`, TZ).startOf('day');
      endLocal   = startLocal.add(1, 'day');
      unit = 'day';
    } else if (scope === 'month') {
      const y = Number(req.query.year || todayLocal.year());
      const m = Number(req.query.month || (todayLocal.month() + 1)); // 1..12
      const mm = String(m).padStart(2, '0');
      startLocal = dayjs.tz(`${y}-${mm}-01 00:00:00`, TZ).startOf('month');
      endLocal   = startLocal.add(1, 'month');
      unit = 'day';
    } else if (scope === 'year') {
      const y = Number(req.query.year || todayLocal.year());
      startLocal = dayjs.tz(`${y}-01-01 00:00:00`, TZ).startOf('year');
      endLocal   = startLocal.add(1, 'year');
      unit = 'month';
    } else {
      return res.status(400).json({ message: "scope must be 'day' | 'month' | 'year'" });
    }

    const start = startLocal.toDate();
    const end   = endLocal.toDate();

    const match = { company, date: { $gte: start, $lt: end } };
    if (shiftType) match.shiftType = shiftType;

    const leaveBucketSwitch = {
      branches: [
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /sick/i } },       then: 'Sick Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /annual/i } },     then: 'Annual Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /maternity/i } },  then: 'Maternity Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /unpaid/i } },     then: 'Unpaid Leave' },
        { case: { $regexMatch: { input: { $ifNull: ['$leaveType', ''] }, regex: /spec?ial/i } },   then: 'Special Leave' },
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
          OnTime: { $sum: { $cond: [{ $eq: ['$status', 'OnTime'] }, 1, 0] } },
          Late:   { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
          Absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          Leave:  { $sum: { $cond: [{ $eq: ['$status', 'Leave'] }, 1, 0] } },
          NoneStatus: { $sum: { $cond: [{ $eq: ['$status', 'None'] }, 1, 0] } },
          RiskNearlyAbandon: { $sum: { $cond: [{ $eq: ['$risk', 'NearlyAbandon'] }, 1, 0] } },
          RiskAbandon:       { $sum: { $cond: [{ $eq: ['$risk', 'Abandon'] }, 1, 0] } },
          RiskRisk:          { $sum: { $cond: [{ $eq: ['$risk', 'Risk'] }, 1, 0] } },
          RiskNone:          { $sum: { $cond: [{ $eq: ['$risk', 'None'] }, 1, 0] } },
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

    const map = new Map(agg.map(r => [new Date(r._id).toISOString(), r]));

    const buckets = [];
    let cursor = startLocal.clone();
    const step = unit === 'day' ? { n: 1, u: 'day' } : unit === 'month' ? { n: 1, u: 'month' } : { n: 1, u: 'year' };

    while (cursor.isBefore(endLocal)) {
      const keyISO = cursor.startOf(unit).toDate().toISOString();
      const found = map.get(keyISO);

      buckets.push({
        key: cursor.format(unit === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'),
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
      end: endLocal.subtract(1, unit).format(unit === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD'),
      buckets,
      totals
    });
  } catch (err) {
    console.error('❌ getAttendanceSeries error:', err);
    res.status(500).json({ message: 'Analytics series failed', error: err.message });
  }
};
