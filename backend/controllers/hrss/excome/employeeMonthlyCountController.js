const Employee = require('../../../models/hrss/employee');
const EmployeeMonthlySnapshot = require('../../../models/hrss/excome/EmployeeMonthlySnapshot');
const moment = require('moment-timezone');

// Map to your own logic if needed
function classifyPosition(employee) {
  if (['Sewer', 'Jumper'].includes(employee.position)) return 'directLabor';
  if (employee.department === 'Merchandising') return 'marketing';
  return 'indirectLabor';
}

// POST /employee-count/snapshot (per company/year/month)
exports.saveMonthlySnapshot = async (req, res) => {
  try {
    // prefer req.company; fall back to req.user.companyId if that’s how your auth sets it
    const company = req.company || req.user?.companyId;
    const year = Number(req.body.year);
    const month = Number(req.body.month); // 0-based

    if (!company || Number.isNaN(year) || Number.isNaN(month)) {
      return res.status(400).json({ message: 'Missing or invalid company/year/month' });
    }

    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // 🔒 tenant filter
    const employees = await Employee.find({
      company,
      status: 'Working',
      joinDate: { $lte: endOfMonth }
    }).lean();

    const counts = { directLabor: 0, marketing: 0, indirectLabor: 0 };
    for (const emp of employees) counts[classifyPosition(emp)]++;

    const snapshot = await EmployeeMonthlySnapshot.findOneAndUpdate(
      { company, year, month },
      { $set: { ...counts, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: 'Snapshot saved successfully', snapshot });
  } catch (err) {
    console.error('[Snapshot Error]', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// GET /employee-snapshots?year=YYYY  (12 months, tenant-scoped)
// 1) Try to read precomputed snapshots for this company
// 2) If missing months, compute on the fly *scoped by company*
exports.getEmployeeMonthlySnapshots = async (req, res) => {
  try {
    const year = Number(req.query.year);
    if (!year) return res.status(400).json({ message: 'Year is required' });

    const company = req.company || req.user?.companyId;
    if (!company) return res.status(403).json({ message: 'Company not found in auth context' });

    const now = moment().tz('Asia/Phnom_Penh');
    const currentMonth = now.month();
    const currentYear = now.year();

    // 1) pull existing snapshots for this company+year
    const snaps = await EmployeeMonthlySnapshot
      .find({ company, year })
      .select('month directLabor marketing indirectLabor')
      .lean();

    const byMonth = new Map(snaps.map(s => [s.month, s]));

    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const isFuture = year > currentYear || (year === currentYear && month > currentMonth);
      if (isFuture) {
        monthlyData.push({ month, directLabor: 0, marketing: 0, indirectLabor: 0 });
        continue;
      }

      // Use snapshot if present
      if (byMonth.has(month)) {
        const s = byMonth.get(month);
        monthlyData.push({
          month,
          directLabor: s.directLabor || 0,
          marketing: s.marketing || 0,
          indirectLabor: s.indirectLabor || 0
        });
        continue;
      }

      // 2) Fallback compute (still tenant-scoped)
      const endOfMonth = moment.tz({ year, month }, 'Asia/Phnom_Penh').endOf('month').toDate();
      const employees = await Employee.find({
        company,                 // 🔒 tenant filter
        joinDate: { $lte: endOfMonth },
        status: 'Working'
      }).lean();

      const counts = { directLabor: 0, marketing: 0, indirectLabor: 0 };
      for (const emp of employees) counts[classifyPosition(emp)]++;

      monthlyData.push({ month, ...counts });
    }

    res.json({ snapshots: monthlyData });
  } catch (err) {
    console.error('Error in getEmployeeMonthlySnapshots:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
