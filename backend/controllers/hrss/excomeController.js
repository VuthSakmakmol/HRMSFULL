// controllers/hrss/excomeController.js
const Employee = require('../../models/hrss/employee');

/**
 * GET /api/excome/employee-count?month=YYYY-MM
 *
 * Returns the number of working employees in three categories
 * as of the end of the requested month.
 */
exports.getMonthlyEmployeeCount = async (req, res) => {
  try {
    // 1. Parse & validate `month` param (YYYY-MM). Default to current month.
    const { month } = req.query;
    let year, monthIndex;

    if (month) {
      const parts = month.split('-');
      if (parts.length !== 2) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM.' });
      }
      year = parseInt(parts[0], 10);
      monthIndex = parseInt(parts[1], 10) - 1;
      if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM.' });
      }
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthIndex = now.getMonth();
    }

    // 2. Compute the last millisecond of that month
    const startOfMonth = new Date(year, monthIndex, 1,   0, 0,   0,   0);
    const endOfMonth   = new Date(year, monthIndex + 1, 0,  23, 59, 59, 999);

    // 3. Ensure `req.company` is set by your auth middleware
    const company = req.company;
    if (!company) {
      return res.status(403).json({ message: 'Unauthorized: company missing' });
    }

    // 4. Base filter: only currently working employees in that company
    //    who joined on or before the end of the month
    const baseFilter = {
      company,
      status: 'Working',
      joinDate: { $lte: endOfMonth }
    };

    // ─── Uncomment to debug your filters ────────────────────────────────
    // console.debug('Excome filters:',
    //   'base:', JSON.stringify(baseFilter),
    //   'direct:', JSON.stringify({ ...baseFilter, position: { $in: ['Sewer','Jumper'] } }),
    //   'marketing:', JSON.stringify({ ...baseFilter, department: 'Merchandising' }),
    //   'indirect:', JSON.stringify({
    //     ...baseFilter,
    //     position:  { $nin: ['Sewer','Jumper'] },
    //     department:{ $ne:  'Merchandising' }
    //   })
    // );
    // ────────────────────────────────────────────────────────────────────

    // 5. Build category-specific filters
    const directLaborFilter = {
      ...baseFilter,
      position: { $in: ['Sewer', 'Jumper'] }
    };
    const marketingFilter = {
      ...baseFilter,
      department: 'Merchandising'
    };
    const indirectLaborFilter = {
      ...baseFilter,
      position:  { $nin: ['Sewer', 'Jumper'] },
      department:{ $ne:  'Merchandising' }
    };

    // 6. Run counts in parallel
    const [directCount, marketingCount, indirectCount] = await Promise.all([
      Employee.countDocuments(directLaborFilter),
      Employee.countDocuments(marketingFilter),
      Employee.countDocuments(indirectLaborFilter),
    ]);

    // 7. Format and return
    const responseMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    return res.json({
      month: responseMonth,
      counts: {
        directLabor:   directCount,
        marketing:     marketingCount,
        indirectLabor: indirectCount
      }
    });
  } catch (err) {
    console.error('[GET MONTHLY EMPLOYEE COUNT ERROR]', err);
    return res.status(500).json({
      message: 'Failed to get employee counts',
      error: err.message
    });
  }
};