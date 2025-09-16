// controllers/hrss/shiftAssignmentController.js
const mongoose = require('mongoose');
const ShiftAssignment = require('../../models/hrss/shiftAssignment');
const ShiftTemplate = require('../../models/hrss/shiftTemplate');

const err400 = (res, message, extra = {}) => res.status(400).json({ message, ...extra });

/* ───────── helpers ───────── */

function asId(x) {
  try { return new mongoose.Types.ObjectId(String(x)); } catch { return null; }
}

/** (A..B) overlaps (C..D) where null means open-ended */
function rangesOverlap(aFrom, aTo, bFrom, bTo) {
  const A = new Date(aFrom).getTime();
  const B = aTo ? new Date(aTo).getTime() : Number.POSITIVE_INFINITY;
  const C = new Date(bFrom).getTime();
  const D = bTo ? new Date(bTo).getTime() : Number.POSITIVE_INFINITY;
  return A <= D && C <= B;
}

async function validatePayload(company, body, { isUpdate = false } = {}) {
  const employeeId = asId(body.employeeId);
  const shiftTemplateId = asId(body.shiftTemplateId);
  const effectiveFrom = body.effectiveFrom ? new Date(body.effectiveFrom) : null;
  const effectiveTo   = body.effectiveTo ? new Date(body.effectiveTo) : null;

  if (!isUpdate) {
    if (!employeeId) throw new Error('employeeId is required');
    if (!shiftTemplateId) throw new Error('shiftTemplateId is required');
    if (!effectiveFrom) throw new Error('effectiveFrom (date) is required');
  }

  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error('effectiveTo must be ≥ effectiveFrom');
  }

  // ensure template exists & is active (optional but nice)
  if (shiftTemplateId) {
    const tpl = await ShiftTemplate.findOne({ _id: shiftTemplateId, company });
    if (!tpl) throw new Error('Shift template not found for this company');
  }

  return { employeeId, shiftTemplateId, effectiveFrom, effectiveTo };
}

/** disallow overlapping assignments for the same employee */
async function assertNoOverlap(company, employeeId, range, exceptId = null) {
  const others = await ShiftAssignment.find({ company, employeeId, _id: { $ne: exceptId } }, { effectiveFrom:1, effectiveTo:1 });
  for (const x of others) {
    if (rangesOverlap(range.effectiveFrom, range.effectiveTo, x.effectiveFrom, x.effectiveTo)) {
      throw new Error('Overlapping assignment exists for this employee');
    }
  }
}

/* ───────── controllers ───────── */

exports.create = async (req, res) => {
  try {
    const company = req.company;
    const { employeeId, shiftTemplateId, effectiveFrom, effectiveTo } =
      await validatePayload(company, req.body, { isUpdate: false });

    await assertNoOverlap(company, employeeId, { effectiveFrom, effectiveTo });

    const doc = await ShiftAssignment.create({
      company, employeeId, shiftTemplateId, effectiveFrom, effectiveTo
    });
    return res.status(201).json(doc);
  } catch (err) {
    return err400(res, 'Create failed', { error: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const company = req.company;
    const { employeeId, shiftTemplateId, activeOnly } = req.query;

    const filter = { company };
    if (employeeId) filter.employeeId = asId(employeeId);
    if (shiftTemplateId) filter.shiftTemplateId = asId(shiftTemplateId);

    // activeOnly = true → effectiveTo is null or in the future
    if (String(activeOnly) === 'true') {
      filter.$or = [
        { effectiveTo: null },
        { effectiveTo: { $gte: new Date() } }
      ];
    }

    const rows = await ShiftAssignment
      .find(filter)
      .sort({ employeeId: 1, effectiveFrom: -1 })
      .populate('shiftTemplateId', 'name timeIn timeOut crossMidnight')
      .lean();

    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'List failed', error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const company = req.company;
    const row = await ShiftAssignment
      .findOne({ _id: req.params.id, company })
      .populate('shiftTemplateId', 'name timeIn timeOut crossMidnight');
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const company = req.company;
    const row = await ShiftAssignment.findOne({ _id: req.params.id, company });
    if (!row) return res.status(404).json({ message: 'Not found' });

    const { employeeId, shiftTemplateId, effectiveFrom, effectiveTo } =
      await validatePayload(company, req.body, { isUpdate: true });

    // apply whitelisted fields if provided
    if (employeeId) row.employeeId = employeeId;
    if (shiftTemplateId) row.shiftTemplateId = shiftTemplateId;
    if (effectiveFrom) row.effectiveFrom = effectiveFrom;
    if (req.body.hasOwnProperty('effectiveTo')) row.effectiveTo = effectiveTo ?? null;

    await assertNoOverlap(company, row.employeeId, { effectiveFrom: row.effectiveFrom, effectiveTo: row.effectiveTo }, row._id);

    await row.validate();
    const saved = await row.save();
    return res.json({ message: '✅ Updated', data: saved });
  } catch (err) {
    return err400(res, 'Update failed', { error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const company = req.company;
    const { soft } = req.query; // ?soft=true → set effectiveTo=today
    const id = req.params.id;

    if (String(soft) === 'true') {
      const r = await ShiftAssignment.updateOne(
        { _id: id, company },
        { $set: { effectiveTo: new Date() } }
      );
      if (!r.matchedCount) return res.status(404).json({ message: 'Not found' });
      return res.json({ message: '🔕 Soft-deleted (effectiveTo set to today)' });
    }

    const r = await ShiftAssignment.deleteOne({ _id: id, company });
    if (!r.deletedCount) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: '🗑️ Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};
