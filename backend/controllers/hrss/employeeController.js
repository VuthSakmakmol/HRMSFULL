/* ───────────────────────── Excel Import: DIRECT SHIFT-AWARE ───────────────────────── */
const XLSX = require('xlsx');
const mongoose = require('mongoose');
const Employee = require('../../models/hrss/employee');
const ShiftTemplate = require('../../models/hrss/shiftTemplate'); 
const { findTemplate } = require('./_helpers/shiftLookup');

let ShiftAssignment;
try {
  ShiftAssignment = require('../../models/hrss/shiftAssignment');
} catch (e) {
  try {
    ShiftAssignment = mongoose.model('ShiftAssignment');
  } catch (_) { /* noop */ }
}

if (!ShiftAssignment) {
  console.error('[BOOT] ShiftAssignment model not loaded. Check models/hrss/shiftAssignment.js export.');
}

/* ---------- small helpers ---------- */
const s = (v) => (v === undefined || v === null ? '' : String(v).trim());
const normalizeDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    const utcDays = Math.floor(v - 25569);
    const utcMillis = utcDays * 86400 * 1000;
    return new Date(utcMillis);
  }
  if (typeof v === 'string') {
    const tryVal = v.replace(/\./g, '-').replace(/\//g, '-');
    const d = new Date(tryVal);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

// ✅ Excel date normalization (handles both numbers and strings safely)
const parseExcelDate = (v) => {
  if (!v) return null;

  // Case 1: numeric Excel serial (days since 1899-12-30)
  if (typeof v === 'number') {
    const jsDate = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (jsDate.getFullYear() === 1970) return null;
    return jsDate;
  }

  // Case 2: already a Date object
  if (v instanceof Date && !isNaN(v.getTime())) {
    if (v.getFullYear() === 1970) return null;
    return v;
  }

  // Case 3: string (try multiple formats)
  if (typeof v === 'string') {
    const tryFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'DD-MM-YYYY', 'MM-DD-YYYY'];
    const parsed = moment(v.replace(/\./g, '-').trim(), tryFormats, true);
    if (parsed.isValid() && parsed.year() >= 1900 && parsed.year() < 2100) {
      return parsed.toDate();
    }
  }

  return null;
};

/* ───────────── current shift summary (from assignments) ───────────── */
async function fetchCurrentShift(company, employeeId) {
  if (!ShiftAssignment) return null;

  const now = new Date();
  const asg = await ShiftAssignment.findOne({
    company,
    employeeId,                 // <- string business ID, not _id
    from: { $lte: now },
    $or: [{ to: null }, { to: { $gt: now } }]
  }).sort({ from: -1 });

  if (!asg) return null;

  const tpl = await ShiftTemplate.findOne({ _id: asg.shiftTemplateId, company }).lean();
  if (!tpl) {
    return {
      shiftTemplateId: asg.shiftTemplateId,
      from: asg.from,
      to: asg.to,
      name: '(missing template)'
    };
  }

  return {
    shiftTemplateId: tpl._id,
    name: tpl.name,
    timeIn: tpl.timeIn,
    timeOut: tpl.timeOut,
    lateAfter: tpl.lateAfter,
    crossMidnight: !!tpl.crossMidnight,
    from: asg.from,
    to: asg.to
  };
}

/* ───────────────────────── header → schema mapping ───────────────────────── */
function mapRowToEmployee(row) {
  // canonical/default shift from any incoming text
  const rawShift = s(row['Shift'] ?? row.shiftName ?? row.shift);
  const defaultShift =
    /night/i.test(rawShift) ? 'Night Shift'
  : /day/i.test(rawShift)   ? 'Day Shift'
  : undefined;

  const out = {
    // Identification / profile
    employeeId: s(row['Employee ID'] ?? row.employeeId),
    profileImage: s(row['Profile Image'] ?? row.profileImage),

    // Personal
    khmerFirstName: s(row['Khmer First Name'] ?? row.khmerFirstName),
    khmerLastName: s(row['Khmer Last Name'] ?? row.khmerLastName),
    englishFirstName: s(row['English First Name'] ?? row.englishFirstName),
    englishLastName: s(row['English Last Name'] ?? row.englishLastName),
    gender: s(row['Gender'] ?? row.gender),
    dob: normalizeDate(row['Date of Birth'] ?? row.dob),
    age: row['Age'] !== undefined ? Number(row['Age']) : (row.age ?? null),
    email: s(row['Email'] ?? row.email),
    phoneNumber: s(row['Phone Number'] ?? row.phoneNumber),
    agentPhoneNumber: s(row['Agent Phone Number'] ?? row.agentPhoneNumber ?? row['Agent Phone']),
    agentPerson: s(row['Agent Person'] ?? row.agentPerson),
    note: s(row['Note'] ?? row.note),

    // Family
    marriedStatus: s(row['Married Status'] ?? row.marriedStatus),
    spouseName: s(row['Spouse Name'] ?? row.spouseName),
    spouseContactNumber: s(row['Spouse Contact Number'] ?? row.spouseContactNumber ?? row['Spouse Contact']),

    // Education & Religion
    education: s(row['Education'] ?? row.education),
    religion: s(row['Religion'] ?? row.religion),
    nationality: s(row['Nationality'] ?? row.nationality),
    resignReason: s(row['Resign Reason'] ?? row.resignReason),

    // Address
    placeOfBirth: {
      provinceNameKh: s(row['Place of Birth - Province'] ?? row.pobProvince ?? row?.placeOfBirth?.provinceNameKh),
      districtNameKh: s(row['Place of Birth - District'] ?? row.pobDistrict ?? row?.placeOfBirth?.districtNameKh),
      communeNameKh: s(row['Place of Birth - Commune'] ?? row.pobCommune ?? row?.placeOfBirth?.communeNameKh),
      villageNameKh: s(row['Place of Birth - Village'] ?? row.pobVillage ?? row?.placeOfBirth?.villageNameKh),
    },
    placeOfLiving: {
      provinceNameKh: s(row['Place of Living - Province'] ?? row.polProvince ?? row?.placeOfLiving?.provinceNameKh),
      districtNameKh: s(row['Place of Living - District'] ?? row.polDistrict ?? row?.placeOfLiving?.districtNameKh),
      communeNameKh: s(row['Place of Living - Commune'] ?? row.polCommune ?? row?.placeOfLiving?.communeNameKh),
      villageNameKh: s(row['Place of Living - Village'] ?? row.polVillage ?? row?.placeOfLiving?.villageNameKh),
    },

    // Work
    joinDate: normalizeDate(row['Join Date'] ?? row.joinDate),
    department: s(row['Department'] ?? row.department),
    position: s(row['Position'] ?? row.position),
    line: s(row['Line'] ?? row.line),
    team: s(row['Team'] ?? row.team),
    section: s(row['Section'] ?? row.section),

    // legacy + canonical shift (legacy text kept; defaultShift used to map)
    shift: rawShift,
    defaultShift,

    status: s(row['Status'] ?? row.status) || 'Working',
    resignDate: normalizeDate(row['Resign Date'] ?? row.resignDate),
    remark: s(row['Remark'] ?? row.remark),

    // Documents
    idCard: s(row['ID Card'] ?? row.idCard),
    idCardExpireDate: normalizeDate(row['ID Expire'] ?? row.idCardExpireDate),
    nssf: s(row['NSSF'] ?? row.nssf),
    passport: s(row['Passport'] ?? row.passport),
    passportExpireDate: normalizeDate(row['Passport Expire Date'] ?? row.passportExpireDate),
    visaExpireDate: normalizeDate(row['Visa Expire Date'] ?? row.visaExpireDate),
    medicalCheck: s(row['Medical Check'] ?? row.medicalCheck),
    medicalCheckDate: normalizeDate(row['Medical Check Date'] ?? row.medicalCheckDate),
    workingBook: s(row['Working Book'] ?? row.workingBook),

    // Source & skill
    sourceOfHiring: s(row['Source of Hiring'] ?? row.sourceOfHiring),
    introducerId: s(row['Introducer ID'] ?? row.introducerId),
    employeeType: s(row['Employee Type'] ?? row.employeeType),
    singleNeedle: s(row['Single Needle'] ?? row.singleNeedle),
    overlock: s(row['Overlock'] ?? row.overlock),
    coverstitch: s(row['Coverstitch'] ?? row.coverstitch),
    totalMachine: row['Total Machines'] !== undefined
      ? Number(row['Total Machines'])
      : (row.totalMachine ?? 0),
  };

  if (Object.values(out.placeOfBirth).every(v => v === '')) out.placeOfBirth = {};
  if (Object.values(out.placeOfLiving).every(v => v === '')) out.placeOfLiving = {};
  return out;
}

/* ───────────────────────── validation rules ───────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?\d{6,20}$/;
const norm = (v) => (typeof v === 'string' ? v.trim() : v);

// Load enum values from schema to avoid typos
const enumSet = (path) => new Set(Employee.schema.path(path)?.enumValues || []);
const ENUMS = {
  gender: enumSet('gender'),
  marriedStatus: enumSet('marriedStatus'),
  education: enumSet('education'),
  religion: enumSet('religion'),
  nationality: enumSet('nationality'),
  status: enumSet('status'),
  sourceOfHiring: enumSet('sourceOfHiring'),
  employeeType: enumSet('employeeType'),
  resignReason: enumSet('resignReason'),
};

function validateEmployeeData(row) {
  const errors = [];

  // Required
  if (!row.employeeId) errors.push('employeeId is required');
  const hasEnglish = row.englishFirstName || row.englishLastName;
  const hasKhmer = row.khmerFirstName || row.khmerLastName;
  if (!hasEnglish && !hasKhmer) errors.push('At least one of (Khmer Name or English Name) is required');

  // Enums
  const checkEnum = (field, set) => {
    const val = norm(row[field]) || '';
    if (val && !set.has(val)) errors.push(`${field} must be one of: ${[...set].filter(Boolean).join(', ')}`);
  };
  checkEnum('gender', ENUMS.gender);
  checkEnum('marriedStatus', ENUMS.marriedStatus);
  checkEnum('education', ENUMS.education);
  checkEnum('religion', ENUMS.religion);
  checkEnum('nationality', ENUMS.nationality);
  checkEnum('status', ENUMS.status);
  checkEnum('sourceOfHiring', ENUMS.sourceOfHiring);
  checkEnum('employeeType', ENUMS.employeeType);
  checkEnum('resignReason', ENUMS.resignReason);

  // Validate canonical shift only (from mapper)
  const SHIFT_SET = new Set(['Day Shift', 'Night Shift']);
  const ds = norm(row.defaultShift);
  if (ds && !SHIFT_SET.has(ds)) errors.push('defaultShift must be one of: Day Shift, Night Shift');

  // Dates
  const isDate = (v) => v instanceof Date && !isNaN(v.getTime());
  const dateInRange = (d, field) => {
    if (!d) return;
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) errors.push(`${field} year should be between 1900 and 2100`);
  };

  ;['dob','joinDate','idCardExpireDate','passportExpireDate','visaExpireDate','medicalCheckDate','resignDate']
    .forEach(f => { if (row[f] && !isDate(row[f])) errors.push(`${f} is not a valid date`); });

  ;[
    ['dob', row.dob],
    ['joinDate', row.joinDate],
    ['idCardExpireDate', row.idCardExpireDate],
    ['passportExpireDate', row.passportExpireDate],
    ['visaExpireDate', row.visaExpireDate],
    ['medicalCheckDate', row.medicalCheckDate],
    ['resignDate', row.resignDate],
  ].forEach(([name, val]) => dateInRange(val, name));

  if (isDate(row.dob) && isDate(row.joinDate) && row.joinDate < row.dob)
    errors.push('joinDate must be after date of birth');

  // Numbers
  if (row.age !== null && row.age !== undefined) {
    const age = Number(row.age);
    if (Number.isNaN(age)) errors.push('age must be a number');
    else if (age < 14 || age > 80) errors.push('age must be between 14 and 80');
  }
  if (row.totalMachine !== null && row.totalMachine !== undefined) {
    const tm = Number(row.totalMachine);
    if (Number.isNaN(tm) || tm < 0) errors.push('totalMachine must be a non-negative number');
  }

  // Contact
  if (row.email && !EMAIL_RE.test(row.email)) errors.push('email is not valid');
  if (row.phoneNumber && !PHONE_RE.test(row.phoneNumber)) errors.push('phoneNumber should be 6-20 digits (optional +)');
  if (row.agentPhoneNumber && !PHONE_RE.test(row.agentPhoneNumber)) errors.push('agentPhoneNumber should be 6-20 digits (optional +)');

  // Nested address lengths (optional)
  const checkAddr = (addr, label) => {
    if (!addr) return;
    for (const [k, v] of Object.entries(addr)) {
      if (typeof v === 'string' && v.length > 100) errors.push(`${label}.${k} is too long (max 100 chars)`);
    }
  };
  checkAddr(row.placeOfBirth, 'placeOfBirth');
  checkAddr(row.placeOfLiving, 'placeOfLiving');

  return errors;
}


/* ───────────────────────── Excel Import: Employee (Exact Model Columns) ───────────────────────── */
exports.importEmployees = async (req, res) => {
  try {
    const company = req.company;
    if (!company)
      return res.status(400).json({ message: 'Unauthorized: company missing' });
    if (!req.file)
      return res.status(400).json({ message: 'No Excel file uploaded' });

    console.log(`[IMPORT] Reading file: ${req.file.originalname}`);

    // 1️⃣ Parse Excel
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length)
      return res.status(400).json({ message: 'No data rows found in Excel' });

    const success = [];
    const failed = [];

    // 2️⃣ Loop through rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const line = i + 2;

      try {
        const employeeId = s(row['Employee ID'] || row['ID']);
        if (!employeeId) throw new Error('Missing Employee ID');

        // Resolve shift template
        const shiftName = s(row['Shift'] || row['Shift Name']);
        let shiftTemplateId = null;
        let shiftTemplate = null;

        if (shiftName) {
          const tpl = await findTemplate(company, shiftName);
          if (tpl) {
            shiftTemplate = tpl;
            shiftTemplateId = tpl._id;
          } else {
            console.warn(`⚠️ Row ${line}: Shift "${shiftName}" not found`);
          }
        }

        // Build Employee data
        const now = new Date();
        const data = {
          company,
          profileImage: s(row['Profile Image']),
          employeeId,
          khmerFirstName: s(row['Khmer First Name']),
          khmerLastName: s(row['Khmer Last Name']),
          englishFirstName: s(row['English First Name']),
          englishLastName: s(row['English Last Name']),
          gender: s(row['Gender']),
          dob: parseExcelDate(row['Date of Birth']),
          age: toInt(row['Age']),
          email: s(row['Email']),
          phoneNumber: s(row['Phone Number']),
          agentPhoneNumber: s(row['Agent Phone Number']),
          agentPerson: s(row['Agent Person']),
          note: s(row['Note']),

          marriedStatus: s(row['Married Status']),
          spouseName: s(row['Spouse Name']),
          spouseContactNumber: s(row['Spouse Contact Number']),

          education: s(row['Education']),
          religion: s(row['Religion']),
          nationality: s(row['Nationality']),
          resignReason: s(row['Resign Reason']),

          placeOfBirth: {
            provinceNameKh: s(row['Birth Province']),
            districtNameKh: s(row['Birth District']),
            communeNameKh: s(row['Birth Commune']),
            villageNameKh: s(row['Birth Village']),
          },
          placeOfLiving: {
            provinceNameKh: s(row['Living Province']),
            districtNameKh: s(row['Living District']),
            communeNameKh: s(row['Living Commune']),
            villageNameKh: s(row['Living Village']),
          },

          joinDate: parseExcelDate(row['Join Date']),
          department: s(row['Department']),
          position: s(row['Position']),
          line: s(row['Line']),
          team: s(row['Team']),
          section: s(row['Section']),

          shiftTemplateId: shiftTemplateId || null,
          shiftEffectiveFrom: shiftTemplateId ? now : null,
          shiftHistory: shiftTemplateId
            ? [{ shiftTemplateId, from: now, to: null }]
            : [],
          shift: shiftTemplate ? shiftTemplate.name : shiftName,
          shiftName: shiftTemplate ? shiftTemplate.name : shiftName,

          status: s(row['Status'] || 'Working'),
          resignDate: parseExcelDate(row['Resign Date']),
          remark: s(row['Remark']),

          idCard: s(row['ID Card']),
          idCardExpireDate: parseExcelDate(row['ID Card Expire Date']),
          nssf: s(row['NSSF']),
          passport: s(row['Passport']),
          passportExpireDate: parseExcelDate(row['Passport Expire Date']),
          visaExpireDate: parseExcelDate(row['Visa Expire Date']),
          medicalCheck: s(row['Medical Check']),
          medicalCheckDate: parseExcelDate(row['Medical Check Date']),
          workingBook: s(row['Working Book']),

          sourceOfHiring: s(row['Source of Hiring']),
          introducerId: s(row['Introducer ID']),
          employeeType: s(row['Employee Type']),
          singleNeedle: s(row['Single Needle']),
          overlock: s(row['Overlock']),
          coverstitch: s(row['Coverstitch']),
          totalMachine: toInt(row['Total Machine']),
        };

        // Remove any 1970 fake date
        if (data.joinDate && data.joinDate.getFullYear() === 1970) data.joinDate = null;
        if (data.resignDate && data.resignDate.getFullYear() === 1970) data.resignDate = null;

        // Save/Upsert Employee
        const emp = await Employee.findOneAndUpdate(
          { company, employeeId },
          { $set: data },
          { new: true, upsert: true }
        );

        // Create initial ShiftAssignment if needed
        if (shiftTemplateId && ShiftAssignment) {
          const exists = await ShiftAssignment.exists({
            company,
            employeeId: emp.employeeId,
            shiftTemplateId,
            to: null,
          });
          if (!exists) {
            await ShiftAssignment.create({
              company,
              employeeId: emp.employeeId,
              shiftTemplateId,
              from: now,
              to: null,
              reason: 'Initial import auto-assignment',
              createdBy: req.user?.name || 'System',
            });
          }
        }

        success.push(employeeId);
      } catch (err) {
        console.error(`❌ Row ${line} failed: ${err.message}`);
        failed.push({
          line,
          employeeId: rows[i]['Employee ID'] || '(unknown)',
          error: err.message || 'Unknown error',
        });
      }
    }

    // Summary
    const summary = {
      total: rows.length,
      imported: success.length,
      failed: failed.length,
    };

    if (failed.length) {
      return res.status(207).json({
        message: 'Import finished — some rows failed',
        summary,
        failed,
      });
    }

    return res.json({
      message: '✅ All employees imported successfully',
      summary,
    });
  } catch (err) {
    console.error('❌ importEmployees error:', err);
    res.status(500).json({ message: 'Import failed', error: err.message });
  }
};

/* ───────────────────────── helpers ───────────────────────── */
const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const toInt = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
};

/* ───────────────────────────────────── CRUD ─────────────────────────────────── */

// controllers/hrss/employeeController.js (only these two exports)

// CREATE
exports.createEmployee = async (req, res) => {
  const session = await Employee.startSession();
  session.startTransaction();
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    // ---- Required inputs
    const shiftTemplateId = String(req.body?.shiftTemplateId || '').trim();
    if (!shiftTemplateId) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'shiftTemplateId is required' });
    }

    // We require a business employeeId (string) to create a shift assignment
    const employeeBusinessId = String(req.body?.employeeId || '').trim();
    if (!employeeBusinessId) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'employeeId (business ID) is required' });
    }

    // ---- Validate shift template belongs to this company
    const tpl = await ShiftTemplate.findOne({ _id: shiftTemplateId, company }).session(session);
    if (!tpl) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'Invalid shiftTemplateId for this company' });
    }

    // ---- Normalize effective-from for the assignment
    const rawEff = req.body?.shiftEffectiveFrom || req.body?.joinDate;
    const effFrom = rawEff ? new Date(rawEff) : new Date();

    // ---- Build employee payload (omit server-managed shift fields from body)
    const {
      shiftTemplateId: _omit1,
      shiftEffectiveFrom: _omit2,
      shiftHistory: _omit3,
      shift: _omit4,
      shiftName: _omit5,
      defaultShift: _omit6,
      currentShift: _omit7,
      company: _omit8,
      ...rest
    } = req.body || {};

    // Ensure body employeeId matches the business ID we validated above
    rest.employeeId = employeeBusinessId;

    // ---- Create employee
    const created = await Employee.create([{
      ...rest,
      company,
      // convenience/denormalized shift fields on employee doc
      shiftTemplateId: tpl._id,
      shiftEffectiveFrom: effFrom,
      shiftName: tpl.name,
      shift: `${tpl.timeIn} → ${tpl.timeOut}${tpl.crossMidnight ? ' (+1d)' : ''}`
    }], { session });

    const empDoc = created[0];

    // ---- Create initial shift assignment (string employeeId + from/to)
    await ShiftAssignment.create([{
      company,
      employeeId: employeeBusinessId,
      shiftTemplateId: tpl._id,
      from: effFrom,
      to: null,
      reason: 'Initial assignment (create)',
      createdBy: req.user?.name || ''
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // ---- Response with currentShift summary attached
    const payload = empDoc.toObject();
    payload.currentShift = {
      shiftTemplateId: tpl._id,
      name: tpl.name,
      timeIn: tpl.timeIn,
      timeOut: tpl.timeOut,
      lateAfter: tpl.lateAfter,
      crossMidnight: !!tpl.crossMidnight,
      from: effFrom,
      to: null
    };

    return res.status(201).json(payload);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[CREATE EMPLOYEE ERROR]', err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate employeeId for this company' });
    }
    return res.status(500).json({ message: err?.message || 'Failed to create employee' });
  }
};


// UPDATE
exports.updateEmployee = async (req, res) => {
  const session = await Employee.startSession();
  session.startTransaction();
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    // ---- Required inputs
    const shiftTemplateId = String(req.body?.shiftTemplateId || '').trim();
    if (!shiftTemplateId) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'shiftTemplateId is required' });
    }

    // ---- Load employee
    const emp = await Employee.findOne({ _id: req.params.id, company }).session(session);
    if (!emp) {
      await session.abortTransaction(); session.endSession();
      return res.status(404).json({ message: 'Employee not found or unauthorized' });
    }

    // Business employee id (string) used in ShiftAssignment
    const employeeBusinessId = String(emp.employeeId || req.body?.employeeId || '').trim();
    if (!employeeBusinessId) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'employeeId (business ID) is required to update shift assignment' });
    }

    // ---- Validate shift template belongs to this company
    const tpl = await ShiftTemplate.findOne({ _id: shiftTemplateId, company }).session(session);
    if (!tpl) {
      await session.abortTransaction(); session.endSession();
      return res.status(400).json({ message: 'Invalid shiftTemplateId for this company' });
    }

    // ---- Normalize effective-from
    const rawEff = req.body?.shiftEffectiveFrom;
    const effFrom = rawEff
      ? new Date(rawEff)
      : (emp.shiftEffectiveFrom || emp.joinDate || new Date());

    // ---- Update employee core + denormalized shift fields
    const {
      shiftTemplateId: _omit1,
      shiftEffectiveFrom: _omit2,
      shiftHistory: _omit3,
      shift: _omit4,
      shiftName: _omit5,
      defaultShift: _omit6,
      currentShift: _omit7,
      company: _omit8,
      employeeId: _omit9, // avoid accidentally changing the business id here
      ...rest
    } = req.body || {};

    emp.set({
      ...rest,
      shiftTemplateId: tpl._id,
      shiftEffectiveFrom: effFrom,
      shiftName: tpl.name,
      shift: `${tpl.timeIn} → ${tpl.timeOut}${tpl.crossMidnight ? ' (+1d)' : ''}`
    });
    await emp.save({ session });

    // ---- Sync assignments:
    // 1) Close any open assignments for this employee
    const now = new Date();
    await ShiftAssignment.updateMany(
      { company, employeeId: employeeBusinessId, to: null },
      { $set: { to: new Date(Math.min(now, effFrom)) } },
      { session }
    );

    // 2) Open a new assignment with the selected template
    await ShiftAssignment.create([{
      company,
      employeeId: employeeBusinessId,
      shiftTemplateId: tpl._id,
      from: effFrom,
      to: null,
      reason: 'Assignment (update)',
      updatedBy: req.user?.name || '',
      createdBy: req.user?.name || ''
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // ---- Response with currentShift summary attached
    const payload = emp.toObject();
    payload.currentShift = {
      shiftTemplateId: tpl._id,
      name: tpl.name,
      timeIn: tpl.timeIn,
      timeOut: tpl.timeOut,
      lateAfter: tpl.lateAfter,
      crossMidnight: !!tpl.crossMidnight,
      from: effFrom,
      to: null
    };

    return res.json(payload);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[UPDATE EMPLOYEE ERROR]', err);
    return res.status(500).json({ message: err?.message || 'Failed to update employee' });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const { page = 1, limit = 10, includeShift } = req.query;
    const query = { company };
    const total = await Employee.countDocuments(query);

    if (limit === 'all') {
      const employees = await Employee.find(query).sort({ createdAt: -1 }).lean();
      const rows = String(includeShift || 'false') === 'true'
        ? await Promise.all(employees.map(async e => ({ ...e, currentShift: await fetchCurrentShift(company, e.employeeId) })))
        : employees;
      return res.json({ employees: rows, total, currentPage: 1, totalPages: 1 });
    }

    const pageInt = Math.max(parseInt(page) || 1, 1);
    const limitInt = Math.max(parseInt(limit) || 10, 1);
    const skip = (pageInt - 1) * limitInt;

    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitInt)
      .lean();

    const rows = String(includeShift || 'false') === 'true'
      ? await Promise.all(employees.map(async e => ({ ...e, currentShift: await fetchCurrentShift(company, e.employeeId) })))
      : employees;

    return res.json({
      employees: rows,
      total,
      currentPage: pageInt,
      totalPages: Math.ceil(total / limitInt),
    });
  } catch (err) {
    console.error('[GET ALL EMPLOYEES ERROR]', err);
    res.status(500).json({ message: 'Failed to get employees', error: err.message });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const company = req.company;
    const employee = await Employee.findOne({ _id: req.params.id, company });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const includeShift = String(req.query.includeShift || 'true') === 'true';
    const payload = employee.toObject();
    if (includeShift) payload.currentShift = await fetchCurrentShift(company, employee.employeeId);

    res.json(payload);
  } catch (err) {
    console.error('[GET EMPLOYEE BY ID ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
};

exports.getEmployeeByEmployeeId = async (req, res) => {
  try {
    const company = req.company;
    const employeeId = req.params.employeeId?.trim();
    if (!employeeId) return res.status(400).json({ error: 'employeeId is required' });

    const employee = await Employee.findOne({ employeeId, company });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    const includeShift = String(req.query.includeShift || 'true') === 'true';
    const payload = employee.toObject();
    if (includeShift) payload.currentShift = await fetchCurrentShift(company, employee.employeeId);

    res.json(payload);
  } catch (err) {
    console.error('[GET EMPLOYEE BY EMPLOYEEID ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch employee by employeeId' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const company = req.company;
    const deleted = await Employee.findOneAndDelete({ _id: req.params.id, company });
    if (!deleted) return res.status(404).json({ message: 'Employee not found or unauthorized' });

    // Also delete this employee's shift assignments
    if (ShiftAssignment) {
      await ShiftAssignment.deleteMany({ company, employeeId: deleted.employeeId });
    }

    res.json({ message: 'Employee deleted' });
  } catch (err) {
    console.error('[DELETE EMPLOYEE ERROR]', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};

exports.deleteMultipleEmployees = async (req, res) => {
  try {
    const company = req.company;
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ message: 'No ids provided' });

    // Find employees to delete so we can also remove their assignments
    const victims = await Employee.find({ _id: { $in: ids }, company }, { employeeId: 1 });
    const empIds = victims.map(v => v.employeeId);

    const result = await Employee.deleteMany({ _id: { $in: ids }, company });
    if (ShiftAssignment && empIds.length) {
      await ShiftAssignment.deleteMany({ company, employeeId: { $in: empIds } });
    }

    res.json({ message: 'Selected employees deleted', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[DELETE MULTIPLE EMPLOYEES ERROR]', err);
    res.status(500).json({ error: 'Failed to delete multiple employees' });
  }
};

/* ───────────────────── Legacy names compatibility ───────────────────── */
exports.confirmImport = exports.confirmImport || exports.importConfirmExcel;
exports.previewImport = exports.previewImport || exports.importPreviewExcel;
