// controllers/hrss/employeeController.js
const XLSX = require('xlsx');
const Employee = require('../../models/hrss/employee');

/* ───────────────────────── helpers: strings & dates ───────────────────────── */
const s = (v) => (v === undefined || v === null ? '' : String(v).trim());

// Excel serial number → Date
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcMillis = utcDays * 86400 * 1000;
  return new Date(utcMillis);
}

// Normalize anything that might be a date into Date|null
function normalizeDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') return excelSerialToDate(v);
  if (typeof v === 'string') {
    const tryVal = v.replace(/\./g, '-').replace(/\//g, '-');
    const d = new Date(tryVal);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/* ───────────────────────── header → schema mapping ───────────────────────── */
function mapRowToEmployee(row) {
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
    shift: s(row['Shift'] ?? row.shift),
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

  // prune empty nested
  if (Object.values(out.placeOfBirth).every(v => v === '')) out.placeOfBirth = {};
  if (Object.values(out.placeOfLiving).every(v => v === '')) out.placeOfLiving = {};

  return out;
}

/* ───────────────────────── validation rules ───────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_RE = /^\+?\d{6,20}$/;

// Load enum values from schema to avoid typos
const enumSet = (path) => new Set(Employee.schema.path(path)?.enumValues || []);
const ENUMS = {
  gender: enumSet('gender'),
  marriedStatus: enumSet('marriedStatus'),
  education: enumSet('education'),
  religion: enumSet('religion'),
  nationality: enumSet('nationality'),
  shift: enumSet('shift'),
  status: enumSet('status'),
  sourceOfHiring: enumSet('sourceOfHiring'),
  employeeType: enumSet('employeeType'),
  resignReason: enumSet('resignReason'),
};

const norm = (v) => (typeof v === 'string' ? v.trim() : v);

function validateEmployeeData(row) {
  const errors = [];

  // Required
  if (!row.employeeId) errors.push('employeeId is required');
  const hasEnglish = row.englishFirstName || row.englishLastName;
  const hasKhmer = row.khmerFirstName || row.khmerLastName;
  if (!hasEnglish && !hasKhmer) {
    errors.push('At least one of (Khmer Name or English Name) is required');
  }

  // Enums
  const checkEnum = (field, set) => {
    const val = norm(row[field]) || '';
    if (val && !set.has(val)) {
      errors.push(`${field} must be one of: ${[...set].filter(Boolean).join(', ')}`);
    }
  };
  checkEnum('gender', ENUMS.gender);
  checkEnum('marriedStatus', ENUMS.marriedStatus);
  checkEnum('education', ENUMS.education);
  checkEnum('religion', ENUMS.religion);
  checkEnum('nationality', ENUMS.nationality);
  checkEnum('shift', ENUMS.shift);
  checkEnum('status', ENUMS.status);
  checkEnum('sourceOfHiring', ENUMS.sourceOfHiring);
  checkEnum('employeeType', ENUMS.employeeType);
  checkEnum('resignReason', ENUMS.resignReason);

  // Dates
  const isDate = (v) => v instanceof Date && !isNaN(v.getTime());
  const dateInRange = (d, field) => {
    if (!d) return;
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) errors.push(`${field} year should be between 1900 and 2100`);
  };

  ['dob','joinDate','idCardExpireDate','passportExpireDate','visaExpireDate','medicalCheckDate','resignDate']
    .forEach(f => {
      if (row[f] && !isDate(row[f])) errors.push(`${f} is not a valid date`);
    });

  [
    ['dob', row.dob],
    ['joinDate', row.joinDate],
    ['idCardExpireDate', row.idCardExpireDate],
    ['passportExpireDate', row.passportExpireDate],
    ['visaExpireDate', row.visaExpireDate],
    ['medicalCheckDate', row.medicalCheckDate],
    ['resignDate', row.resignDate],
  ].forEach(([name, val]) => dateInRange(val, name));

  if (isDate(row.dob) && isDate(row.joinDate) && row.joinDate < row.dob) {
    errors.push('joinDate must be after date of birth');
  }

  // Numbers
  if (row.age !== null && row.age !== undefined) {
    const age = Number(row.age);
    if (Number.isNaN(age)) errors.push('age must be a number');
    else if (age < 14 || age > 80) errors.push('age must be between 14 and 80');
  }
  if (row.totalMachine !== null && row.totalMachine !== undefined) {
    const tm = Number(row.totalMachine);
    if (Number.isNaN(tm) || tm < 0) errors.push('totalMachine must be a non‑negative number');
  }

  // Contact
  if (row.email && !EMAIL_RE.test(row.email)) errors.push('email is not valid');
  if (row.phoneNumber && !PHONE_RE.test(row.phoneNumber)) errors.push('phoneNumber should be 6‑20 digits (optional +)');
  if (row.agentPhoneNumber && !PHONE_RE.test(row.agentPhoneNumber)) errors.push('agentPhoneNumber should be 6‑20 digits (optional +)');

  // Nested address lengths (optional)
  const checkAddr = (addr, label) => {
    if (!addr) return;
    for (const [k, v] of Object.entries(addr)) {
      if (typeof v === 'string' && v.length > 100) {
        errors.push(`${label}.${k} is too long (max 100 chars)`);
      }
    }
  };
  checkAddr(row.placeOfBirth, 'placeOfBirth');
  checkAddr(row.placeOfLiving, 'placeOfLiving');

  return errors;
}

/* ───────────────────────── Excel Import: FILE PREVIEW ─────────────────────────
   POST /employees/import-excel  (with multer memory .single('file'))
   Returns: { toImport, duplicates, invalid }
-------------------------------------------------------------------------------*/
exports.importPreviewExcel = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const parsed = rows.map(mapRowToEmployee);

    const incomingIds = [...new Set(parsed.map(r => r.employeeId).filter(Boolean))];
    const existingIds = await Employee.find({ company, employeeId: { $in: incomingIds } }).distinct('employeeId');

    const duplicates = [];
    const toImport = [];
    const invalid = [];

    parsed.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-based with header row
      const errs = validateEmployeeData(row);

      if (errs.length) {
        invalid.push({ row: rowNum, employeeId: row.employeeId || '', errors: errs });
      } else if (row.employeeId && existingIds.includes(row.employeeId)) {
        duplicates.push(row);
      } else if (row.employeeId) {
        toImport.push(row);
      }
    });

    return res.json({ toImport, duplicates, invalid });
  } catch (err) {
    console.error('❌ importPreviewExcel error:', err);
    return res.status(500).json({ message: 'Preview failed', error: err.message });
  }
};

/* ───────────────────────── Excel Import: JSON PREVIEW ─────────────────────────
   POST /employees/import-preview  (body = raw array of rows)
   Returns: { toImport, duplicates, invalid }
-------------------------------------------------------------------------------*/
exports.previewImport = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });
    const data = Array.isArray(req.body) ? req.body : [];
    if (!data.length) return res.status(400).json({ message: 'No data received' });

    const parsed = data.map(mapRowToEmployee);
    const incomingIds = [...new Set(parsed.map(r => r.employeeId).filter(Boolean))];
    const existingIds = await Employee.find({ company, employeeId: { $in: incomingIds } }).distinct('employeeId');

    const duplicates = [];
    const toImport = [];
    const invalid = [];

    parsed.forEach((row, idx) => {
      const rowNum = idx + 2;
      const errs = validateEmployeeData(row);
      if (errs.length) {
        invalid.push({ row: rowNum, employeeId: row.employeeId || '', errors: errs });
      } else if (row.employeeId && existingIds.includes(row.employeeId)) {
        duplicates.push(row);
      } else if (row.employeeId) {
        toImport.push(row);
      }
    });

    return res.json({ toImport, duplicates, invalid });
  } catch (err) {
    console.error('❌ previewImport error:', err);
    return res.status(500).json({ message: 'Preview failed', error: err.message });
  }
};

/* ───────────────────────── Excel Import: CONFIRM (JSON) ───────────────────────
   POST /employees/import-confirmed   body: { toImport: [...] }
-------------------------------------------------------------------------------*/
exports.importConfirmExcel = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const toImport = Array.isArray(req.body?.toImport) ? req.body.toImport : [];
    if (!toImport.length) return res.status(400).json({ message: 'No data to import' });

    const inserted = [];
    const failed = [];

    for (let i = 0; i < toImport.length; i++) {
      const raw = toImport[i];
      try {
        const data = mapRowToEmployee(raw);
        const errs = validateEmployeeData(data);
        if (errs.length) throw new Error(errs.join(' | '));

        const emp = new Employee({ ...data, company });
        await emp.validate(); // mongoose-level too
        await emp.save();
        inserted.push(emp);
      } catch (err) {
        failed.push({
          row: i + 2,
          employeeId: raw?.employeeId || '',
          reason: (err.message || '').split(' | ')
        });
      }
    }

    return res.status(200).json({
      message: `Imported ${inserted.length} employees.`,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    console.error('❌ importConfirmExcel error:', err);
    return res.status(500).json({ message: 'Import failed', error: err.message });
  }
};

// alias to match older route name if you use confirmImport
exports.confirmImport = exports.importConfirmExcel;

/* ───────────────────────── Excel Import: DIRECT SAVE ─────────────────────────
   POST /employees/import-excel  (if you choose to save immediately)
-------------------------------------------------------------------------------*/
exports.importExcelDirect = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const inserted = [];
    const failed = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      try {
        const data = mapRowToEmployee(raw);
        const errs = validateEmployeeData(data);
        if (errs.length) throw new Error(errs.join(' | '));

        const emp = new Employee({ ...data, company });
        await emp.validate();
        await emp.save();
        inserted.push(emp);
      } catch (err) {
        failed.push({
          row: i + 2,
          employeeId: raw?.employeeId || '',
          reason: (err.message || '').split(' | ')
        });
      }
    }

    return res.status(200).json({
      message: `✅ Imported ${inserted.length} employees.`,
      failedCount: failed.length,
      failed,
    });
  } catch (err) {
    console.error('❌ importExcelDirect error:', err);
    return res.status(500).json({ message: 'Import failed', error: err.message });
  }
};

/* ───────────────────────────────────── CRUD ─────────────────────────────────── */
exports.createEmployee = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const emp = new Employee({ ...req.body, company });
    await emp.save();
    res.status(201).json(emp);
  } catch (err) {
    console.error('[CREATE ERROR]', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllEmployees = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return res.status(403).json({ message: 'Unauthorized: company missing' });

    const { page = 1, limit = 10 } = req.query;
    const query = { company };
    const total = await Employee.countDocuments(query);

    if (limit === 'all') {
      const employees = await Employee.find(query).sort({ createdAt: -1 });
      return res.json({ employees, total, currentPage: 1, totalPages: 1 });
    }

    const pageInt = Math.max(parseInt(page) || 1, 1);
    const limitInt = Math.max(parseInt(limit) || 10, 1);
    const skip = (pageInt - 1) * limitInt;

    const employees = await Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitInt);

    return res.json({
      employees,
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
    res.json(employee);
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
    res.json(employee);
  } catch (err) {
    console.error('[GET EMPLOYEE BY EMPLOYEEID ERROR]', err);
    res.status(500).json({ error: 'Failed to fetch employee by employeeId' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const company = req.company;
    const updated = await Employee.findOneAndUpdate(
      { _id: req.params.id, company },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Employee not found or unauthorized' });
    res.json(updated);
  } catch (err) {
    console.error('[UPDATE EMPLOYEE ERROR]', err);
    res.status(500).json({ error: 'Failed to update employee', details: err.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const company = req.company;
    const deleted = await Employee.findOneAndDelete({ _id: req.params.id, company });
    if (!deleted) return res.status(404).json({ message: 'Employee not found or unauthorized' });
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

    const result = await Employee.deleteMany({ _id: { $in: ids }, company });
    res.json({ message: 'Selected employees deleted', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[DELETE MULTIPLE EMPLOYEES ERROR]', err);
    res.status(500).json({ error: 'Failed to delete multiple employees' });
  }
};

/* ───────────────────── Legacy names compatibility ───────────────────── */
// If your routes reference these names, they still work:
exports.previewImport = exports.previewImport || exports.importPreviewExcel;
