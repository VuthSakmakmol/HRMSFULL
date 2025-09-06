// controllers/hrss/shiftAssignmentController.js
const dayjs = require('dayjs');
const ShiftAssignment = require('../../models/hrss/shiftAssignment');
const ShiftTemplate = require('../../models/hrss/shiftTemplate');

function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  const aStart = aFrom.getTime();
  const aEnd   = aTo ? aTo.getTime() : Number.POSITIVE_INFINITY;
  const bStart = bFrom.getTime();
  const bEnd   = bTo ? bTo.getTime() : Number.POSITIVE_INFINITY;
  return aStart <= bEnd && bStart <= aEnd;
}

exports.createAssignment = async (req, res) => {
  try {
    const company = req.company;
    const { employeeId, shiftTemplateId, from, to, reason } = req.body || {};
    if (!employeeId || !shiftTemplateId || !from) {
      return res.status(400).json({ message: 'employeeId, shiftTemplateId and from are required' });
    }

    // Template must exist & be active
    const tmpl = await ShiftTemplate.findOne({ _id: shiftTemplateId, company, active: true });
    if (!tmpl) return res.status(400).json({ message: 'Shift template not found or inactive' });

    const fromD = new Date(from);
    const toD   = to ? new Date(to) : null;
    if (toD && fromD > toD) return res.status(400).json({ message: '`from` must be <= `to`' });

    // No overlaps for this employee
    const existing = await ShiftAssignment.find({ company, employeeId });
    const overlap = existing.some(x => rangesOverlap(fromD, toD, x.from, x.to));
    if (overlap) return res.status(409).json({ message: 'Overlapping assignment exists for this employee' });

    const created = await ShiftAssignment.create({
      company, employeeId, shiftTemplateId, from: fromD, to: toD || null, reason: reason || ''
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ message: 'Create failed', error: err.message });
  }
};

exports.listAssignments = async (req, res) => {
  try {
    const company = req.company;
    const { employeeId } = req.query;
    const filter = { company };
    if (employeeId) filter.employeeId = employeeId;

    const rows = await ShiftAssignment.find(filter).sort({ employeeId: 1, from: 1 })
      .populate({ path: 'shiftTemplateId', select: 'name code active timeIn lateAfter timeOut' });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'List failed', error: err.message });
  }
};

exports.getAssignment = async (req, res) => {
  try {
    const company = req.company;
    const row = await ShiftAssignment.findOne({ _id: req.params.id, company })
      .populate({ path: 'shiftTemplateId', select: 'name code active timeIn lateAfter timeOut' });
    if (!row) return res.status(404).json({ message: 'Not found' });
    res.json(row);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const company = req.company;
    const body = req.body || {};
    const row = await ShiftAssignment.findOne({ _id: req.params.id, company });
    if (!row) return res.status(404).json({ message: 'Not found' });

    if (body.employeeId !== undefined) row.employeeId = String(body.employeeId).trim();
    if (body.shiftTemplateId !== undefined) {
      const tmpl = await ShiftTemplate.findOne({ _id: body.shiftTemplateId, company, active: true });
      if (!tmpl) return res.status(400).json({ message: 'Shift template not found or inactive' });
      row.shiftTemplateId = tmpl._id;
    }
    if (body.from !== undefined) row.from = new Date(body.from);
    if (body.to !== undefined) row.to = body.to ? new Date(body.to) : null;
    if (row.to && row.from > row.to) return res.status(400).json({ message: '`from` must be <= `to`' });
    if (body.reason !== undefined) row.reason = body.reason;

    // Overlap check (excluding this row)
    const others = await ShiftAssignment.find({ company, employeeId: row.employeeId, _id: { $ne: row._id } });
    const overlap = others.some(x => rangesOverlap(row.from, row.to, x.from, x.to));
    if (overlap) return res.status(409).json({ message: 'Overlapping assignment exists for this employee' });

    const saved = await row.save();
    res.json({ message: '✅ Updated', data: saved });
  } catch (err) {
    res.status(400).json({ message: 'Update failed', error: err.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const company = req.company;
    await ShiftAssignment.deleteOne({ _id: req.params.id, company });
    res.json({ message: '🗑️ Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};

/**
 * Resolve the effective template for employeeId @ date
 * GET /api/hrss/shift-assignments/resolve?employeeId=&date=YYYY-MM-DD
 */
exports.resolveEffective = async (req, res) => {
  try {
    const company = req.company;
    const { employeeId, date } = req.query;
    if (!employeeId || !date) return res.status(400).json({ message: 'employeeId and date are required' });
    const d0 = dayjs(date).startOf('day').toDate();

    const a = await ShiftAssignment.findOne({
      company, employeeId,
      from: { $lte: d0 },
      $or: [{ to: null }, { to: { $gte: d0 } }]
    }).populate({ path: 'shiftTemplateId' });

    if (!a) return res.status(404).json({ message: 'No assignment for this date' });
    res.json({
      employeeId,
      date,
      template: a.shiftTemplateId
    });
  } catch (err) {
    res.status(500).json({ message: 'Resolve failed', error: err.message });
  }
};
