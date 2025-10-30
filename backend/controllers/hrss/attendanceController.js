// controllers/hrss/attendanceController.js
const Attendance      = require('../../models/hrss/attendances');
const Employee        = require('../../models/hrss/employee');
const ShiftAssignment = require('../../models/hrss/shiftAssignment');
const WorkCalendar    = require('../../models/hrss/workCalendar');
const ShiftTemplate   = require('../../models/hrss/shiftTemplate');
const XLSX            = require('xlsx');
const dayjs           = require('dayjs');
const utc             = require('dayjs/plugin/utc');
const timezone        = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Phnom_Penh';

/* ────────────────────── Helper Utilities ────────────────────── */

// Convert "HH:mm" or Excel float → minutes
function toMinutes(t) {
  if (t == null || t === '') return null;
  let str = String(t).trim();
  if (!isNaN(str) && Number(str) < 1) return Math.round(Number(str) * 1440); // Excel float like 0.25
  if (/^\d{3,4}$/.test(str)) {
    str = str.padStart(4, '0');
    const h = Number(str.slice(0, 2)), m = Number(str.slice(2, 4));
    return h * 60 + m;
  }
  if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(str)) {
    const [h, m] = str.split(':').map(Number);
    return h * 60 + m;
  }
  const ampm = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    const isPM = ampm[3].toLowerCase() === 'pm';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
}

// Normalize Excel numeric time → HH:mm
function normalizeExcelTime(str) {
  if (!str && str !== 0) return '';
  if (typeof str === 'number') {
    const totalMinutes = Math.round(str * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  str = String(str).trim();
  if (/^\d{3,4}$/.test(str)) {
    const h = str.slice(0, -2);
    const m = str.slice(-2);
    return `${h.padStart(2, '0')}:${m}`;
  }
  if (/^\d{1,2}[.: ]\d{1,2}$/.test(str)) {
    const [h, m] = str.split(/[.: ]/);
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  }
  if (/^\d{1,2}:\d{2}$/.test(str)) return str;
  return '';
}


// Excel date formatter
function formatExcelDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d)
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const s = value.trim().replace(/[./\\\s]+/g, '-');
    const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    const dmy = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    const tentative = dayjs(s);
    if (tentative.isValid()) return tentative.format('YYYY-MM-DD');
  }
  return null;
}

const startOfDayTZ = (dLike) => dayjs.tz(dLike, TZ).startOf('day');
const parseTimeToDateTZ = (baseDateStr, timeStr) => {
  if (!timeStr) return null;
  const [h, m] = String(timeStr).split(':').map(Number);
  return dayjs.tz(baseDateStr, TZ).hour(h || 0).minute(m || 0).second(0).toDate();
};

// Determine day type from WorkCalendar
async function getDayType(company, dateOnly) {
  const d0 = startOfDayTZ(dateOnly).toDate();
  const cal = await WorkCalendar.findOne({ company, date: d0 }).lean();
  if (cal?.dayType) return cal.dayType;
  const dow = dayjs.tz(d0, TZ).day();
  return dow === 0 ? 'Sunday' : 'Working';
}

const hhmmToMin = (s) => {
  if (!s || typeof s !== 'string' || !/^\d{2}:\d{2}$/.test(s)) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

// Convert Excel → JSON while preserving leading zeros
function readExcelAsStrings(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellText: false, cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell && typeof cell.v !== 'string') cell.v = String(cell.v).padStart(4, '0');
    }
  }
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

/* ────────────────────── Evaluation with Template ────────────────────── */
function evaluateWithTemplate(template, startTime, endTime) {
  const flags = [];
  if (!template) return { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0, flags };

  const allowX = !!template.crossMidnight || !!template.window?.allowCrossMidnight;

  const tIn = hhmmToMin(template.timeIn);
  const tOut = hhmmToMin(template.timeOut);
  const tLate = hhmmToMin(template.lateAfter);
  const earliestIn = hhmmToMin(template.window?.earliestIn);
  const latestIn = hhmmToMin(template.window?.latestIn);

  if (tIn == null || tOut == null) return { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0, flags };

  let inMin = toMinutes(startTime);
  let outMin = toMinutes(endTime);
  if (inMin == null && outMin == null) return { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0, flags };

  if (allowX) {
    const MID = 360; // 06:00 AM
    if (inMin != null && inMin < MID) inMin += 1440;
    if (outMin != null && outMin < (inMin ?? tIn)) outMin += 1440;
  }

  if (earliestIn && inMin && inMin < earliestIn) flags.push('SCAN_BEFORE_EARLIEST_IN');
  if (latestIn && inMin && inMin > latestIn) flags.push('SCAN_AFTER_LATEST_IN');

  const lateMinutes = inMin && tLate && inMin > tLate ? inMin - tLate : 0;
  const expOut = allowX && tOut < tIn ? tOut + 1440 : tOut;
  const overtimeMinutes = outMin && outMin > expOut ? outMin - expOut : 0;

  let status;
  if (inMin == null || outMin == null) status = 'Absent';
  else if (lateMinutes > 15) status = 'Late';
  else status = 'OnTime';

  return { status, lateMinutes, overtimeMinutes, flags };
}

/* ────────────────────── Get Employee Template ────────────────────── */
async function getEmployeeTemplate(company, employeeId, date) {
  if (!employeeId) return null;
  const assign = await ShiftAssignment.findOne({
    company,
    employeeId, // ✅ use employeeId string, not _id
    effectiveFrom: { $lte: date },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: date } }],
  }).populate('shiftTemplateId').lean();
  return assign?.shiftTemplateId || null;
}

/* ───────────────────── Import Attendance (Per-Employee Shift Detection + Evaluation) ───────────────────── */
exports.importAttendance = async (req, res) => {
  try {
    const { mode = 'commit', allowUnknown = true, allowNonWorking = false } = req.body;
    const company = req.company;
    if (!company) return res.status(400).json({ message: 'Missing company context' });
    if (!req.file?.buffer) return res.status(400).json({ message: 'No Excel file provided' });

    const rows = readExcelAsStrings(req.file.buffer);
    if (!rows.length) return res.status(400).json({ message: 'Empty Excel file' });

    // 🗓 Determine date from file
    const firstDateStr = rows.map(r => formatExcelDate(r.date)).find(Boolean);
    if (!firstDateStr) return res.status(400).json({ message: 'Invalid date in Excel' });
    const dateOnly = startOfDayTZ(firstDateStr).toDate();

    // 🗓 Check if day is Sunday/Holiday
    const dayType = await getDayType(company, dateOnly);
    const isNonWorking = ['Sunday', 'Holiday'].includes(dayType);

    // 🧩 Load all employee docs by employeeId
    const empIds = [...new Set(rows.map(r => String(r.employeeId || '').trim()).filter(Boolean))];
    const empDocs = await Employee.find({ company, employeeId: { $in: empIds } })
      .select('employeeId englishFirstName englishLastName department position line shiftTemplateId')
      .lean();

    /* ───────── STEP 1: Map employees ───────── */
    const empMap = {};
    for (const e of empDocs) empMap[e.employeeId.trim().toUpperCase()] = e;

    /* ───────── STEP 2: Load their current assigned shiftTemplateId (direct on employee) ───────── */
    const tmplCache = {};
    const empShiftIds = empDocs
      .map(e => e.shiftTemplateId)
      .filter(Boolean)
      .map(id => String(id));

    if (empShiftIds.length) {
      const tmplDocs = await ShiftTemplate.find({ _id: { $in: empShiftIds } }).lean();
      for (const emp of empDocs) {
        const tmpl = tmplDocs.find(t => String(t._id) === String(emp.shiftTemplateId));
        if (tmpl) {
          tmplCache[emp.employeeId.trim().toUpperCase()] = tmpl;
        }
      }
    }

    /* ───────── STEP 3: For employees missing direct shift, check ShiftAssignment ───────── */
    const missingEmpIds = empDocs
      .filter(e => !tmplCache[e.employeeId.trim().toUpperCase()])
      .map(e => e._id);

    if (missingEmpIds.length) {
      const assigns = await ShiftAssignment.find({
        company,
        employeeId: { $in: missingEmpIds },
        effectiveFrom: { $lte: dateOnly },
        $or: [{ effectiveTo: null }, { effectiveTo: { $gte: dateOnly } }],
      })
        .populate('shiftTemplateId')
        .lean();

      for (const a of assigns) {
        const empDoc = empDocs.find(e => String(e._id) === String(a.employeeId));
        if (empDoc && a.shiftTemplateId) {
          tmplCache[empDoc.employeeId.trim().toUpperCase()] = a.shiftTemplateId;
        }
      }
    }

    /* ───────── STEP 4: Fallback default shifts ───────── */
    const defaultDayShift = await ShiftTemplate.findOne({ company, name: /day/i, active: true }).lean();
    const defaultNightShift = await ShiftTemplate.findOne({ company, name: /night/i, active: true }).lean();

    // 🧮 Prepare batch insert/update
    const bulkOps = [];
    const missingEmployees = [];

    for (const r of rows) {
      const empIdStr = String(r.employeeId || '').trim().toUpperCase();
      if (!empIdStr) continue;

      const emp = empMap[empIdStr];
      const dateStr = formatExcelDate(r.date);
      if (!dateStr) continue;

      const startTime = normalizeExcelTime(r.startTime);
      const endTime = normalizeExcelTime(r.endTime);
      const startMin = toMinutes(startTime);

      // ───────── Find Template ─────────
      let tmpl = tmplCache[empIdStr] || null;
      let shiftSource = 'Employee'; // default origin label

      if (!tmpl) {
        // auto-detect if no shiftTemplate assigned
        if (startMin != null && startMin >= 1080 && defaultNightShift) {
          tmpl = defaultNightShift;
          shiftSource = 'AutoDetect-Night';
        } else if (defaultDayShift) {
          tmpl = defaultDayShift;
          shiftSource = 'AutoDetect-Day';
        } else {
          shiftSource = 'Fallback';
        }
      }

      // 🧮 Evaluate based on template
      const ev = tmpl
        ? evaluateWithTemplate(tmpl, startTime, endTime)
        : { status: 'Absent', lateMinutes: 0, overtimeMinutes: 0 };

      // 🧾 Log per employee
      const logLabel = tmpl?.name || 'None';
      console.log(
        `🕓 [ShiftMatch] ${empIdStr} → ${logLabel} (${shiftSource}) | Status=${ev.status}`
      );

      if (!emp && !allowUnknown) {
        missingEmployees.push(empIdStr);
        continue;
      }

      const fullName = emp
        ? `${emp.englishFirstName || ''} ${emp.englishLastName || ''}`.trim()
        : r.fullName || 'Unknown';

      // 🧩 Upsert attendance record
      bulkOps.push({
        updateOne: {
          filter: {
            employeeId: empIdStr,
            date: startOfDayTZ(dateStr).toDate(),
            company,
          },
          update: {
            $set: {
              employeeId: empIdStr,
              company,
              date: startOfDayTZ(dateStr).toDate(),
              fullName,
              department: emp?.department || '',
              position: emp?.position || '',
              line: emp?.line || '',
              shiftTemplateId: tmpl?._id || null,
              shiftName: tmpl?.name || 'Unknown Shift',
              shiftType: tmpl?.name || 'Unknown',
              status: ev.status,
              lateMinutes: ev.lateMinutes,
              overtimeHours: (ev.overtimeMinutes || 0) / 60,
              timeIn: parseTimeToDateTZ(dateStr, startTime),
              timeOut: parseTimeToDateTZ(dateStr, endTime),
            },
          },
          upsert: true,
        },
      });
    }

    // 🧪 Validation Mode
    if (mode === 'validate') {
      return res.json({
        ok: true,
        message: '✅ Validation passed',
        totalRows: rows.length,
        validRows: bulkOps.length,
        unknownEmployees: missingEmployees,
        nonWorkingDay: isNonWorking ? dayType : null,
      });
    }

    // 🛑 Prevent import on holiday if not allowed
    if (isNonWorking && !allowNonWorking) {
      return res.status(409).json({
        ok: false,
        message: `This date (${dayType}) is marked as non-working. Enable override to import.`,
      });
    }

    // 💾 Bulk write
    if (bulkOps.length) await Attendance.bulkWrite(bulkOps, { ordered: false });

    res.json({
      ok: true,
      message: `✅ Imported ${bulkOps.length} attendance records successfully.`,
      unknownEmployees: missingEmployees.length,
      warnings: { dayType },
    });
  } catch (err) {
    console.error('❌ Import error:', err);
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
};



/* ────────────────────── LEAVE UPDATE ────────────────────── */
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
      const tmpl = await getEmployeeTemplate(company, employeeId, date);
      const emp = await Employee.findOne({ employeeId, company })
        .select('englishFirstName englishLastName')
        .lean();

      const existing = await Attendance.findOne({ employeeId, company, date });
      if (existing) {
        existing.status = 'Leave';
        existing.leaveType = leaveType;
        if (tmpl) existing.shiftName = tmpl.name;
        await existing.save();
        result.push({ employeeId, date: formattedDateStr, updated: true });
      } else {
        await Attendance.create({
          company, employeeId, date,
          status: 'Leave',
          leaveType,
          fullName: emp ? `${emp.englishFirstName} ${emp.englishLastName}`.trim() : 'Unknown',
        });
        result.push({ employeeId, date: formattedDateStr, created: true });
      }
    }

    res.json({ message: `✅ Leave processed: ${result.length}`, result });
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

/* ───────────────────── Remaining endpoints (short form) ───────────────────── */

// Fetch all
exports.getAllAttendance = async (req, res) => {
  try {
    const company = req.company;
    const query = { company };
    if (req.query.date) {
      const d = startOfDayTZ(req.query.date);
      query.date = { $gte: d.toDate(), $lt: d.add(1, 'day').toDate() };
    }
    const rec = await Attendance.find(query).sort({ date: -1 });
    res.json(rec);
  } catch (err) {
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
