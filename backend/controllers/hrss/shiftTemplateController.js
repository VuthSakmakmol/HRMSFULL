/* eslint-disable no-console */
const ShiftTemplate = require('../../models/hrss/shiftTemplate');
const ShiftAssignment = require('../../models/hrss/shiftAssignment');

/* ───────────────────────── helpers ───────────────────────── */
const HHMM = /^\d{2}:\d{2}$/;
const isHHmm = (v) => HHMM.test(String(v || ''));
const asUndef = (v) => (v === '' || v === null ? undefined : v);
const err400 = (res, msg, extra = {}) => res.status(400).json({ message: msg, ...extra });

/** convert HH:mm → Date for comparison */
const toDate = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m, 0, 0));
};
const cmpHHmm = (a, b) => toDate(a) - toDate(b);

/* ───────────────────────── payload builder ───────────────────────── */
function buildPayload(raw) {
  const body = raw || {};
  const payload = {
    company: undefined, // filled in controller
    name: asUndef(body.name),
    code: asUndef(body.code),
    active: body.active ?? true,
    version: body.version ?? 1,
    effectiveFrom: asUndef(body.effectiveFrom),
    effectiveTo: asUndef(body.effectiveTo),

    timeIn: asUndef(body.timeIn),
    lateAfter: asUndef(body.lateAfter),
    timeOut: asUndef(body.timeOut),
    crossMidnight: !!body.crossMidnight,

    window: body.window
      ? {
          earliestIn: asUndef(body.window.earliestIn),
          latestIn: asUndef(body.window.latestIn),
          earliestOut: asUndef(body.window.earliestOut),
          latestOut: asUndef(body.window.latestOut),
          allowCrossMidnight: !!body.window.allowCrossMidnight,
        }
      : undefined,

    breaks: Array.isArray(body.breaks)
      ? body.breaks.map((b) => ({
          start: asUndef(b.start),
          end: asUndef(b.end),
          paid: !!b.paid,
        }))
      : [],

    ot: body.ot
      ? {
          mode: asUndef(body.ot.mode) || 'DISABLED',
          startAfterMin: Number(body.ot.startAfterMin || 0),
          roundingMin: Number(body.ot.roundingMin || 0),
          tiers: Array.isArray(body.ot.tiers) ? body.ot.tiers : [],
        }
      : { mode: 'DISABLED', startAfterMin: 0, roundingMin: 0, tiers: [] },

    daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek : [],
    excludeHolidays: !!body.excludeHolidays,
  };

  /* basic required */
  if (!payload.name) throw new Error('name is required');
  ['timeIn', 'lateAfter', 'timeOut'].forEach((f) => {
    if (!isHHmm(payload[f])) throw new Error(`${f} must be HH:mm`);
  });

  if (cmpHHmm(payload.lateAfter, payload.timeIn) < 0)
    throw new Error('lateAfter must be ≥ timeIn');

  if (!payload.crossMidnight && cmpHHmm(payload.timeOut, payload.timeIn) < 0)
    throw new Error('timeOut must be ≥ timeIn unless crossMidnight=true');

  return payload;
}

/* ───────────────────────── controllers ───────────────────────── */

// ➕ CREATE
exports.createShiftTemplate = async (req, res) => {
  try {
    const company = req.company;
    if (!company) return err400(res, 'Unauthorized: company missing');
    const payload = buildPayload(req.body);
    payload.company = company;

    const doc = new ShiftTemplate(payload);
    await doc.validate();
    const saved = await doc.save();

    return res.status(201).json(saved);
  } catch (err) {
    const first = err?.errors ? Object.values(err.errors)[0]?.message : null;
    return err400(res, 'Create failed', { error: first || err.message });
  }
};

// 📋 LIST
exports.listShiftTemplates = async (req, res) => {
  try {
    const { company } = req;
    const { q, active } = req.query;
    const filter = { company };
    if (q) filter.name = { $regex: q, $options: 'i' };
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;

    const rows = await ShiftTemplate.find(filter).sort({ name: 1 });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'List failed', error: err.message });
  }
};

// 🔍 GET
exports.getShiftTemplate = async (req, res) => {
  try {
    const row = await ShiftTemplate.findOne({
      _id: req.params.id,
      company: req.company,
    });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

// ✏️ UPDATE
exports.updateShiftTemplate = async (req, res) => {
  try {
    const company = req.company;
    const existing = await ShiftTemplate.findOne({ _id: req.params.id, company });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const payload = buildPayload(req.body);
    delete payload.company;

    Object.assign(existing, payload);
    await existing.validate();
    const saved = await existing.save();

    return res.json({ message: '✅ Updated', data: saved });
  } catch (err) {
    const first = err?.errors ? Object.values(err.errors)[0]?.message : null;
    return err400(res, 'Update failed', { error: first || err.message });
  }
};

// 🗑️ DELETE (soft if in use)
exports.deleteShiftTemplate = async (req, res) => {
  try {
    const company = req.company;
    const id = req.params.id;

    const inUse = await ShiftAssignment.exists({ company, shiftTemplateId: id });
    if (inUse) {
      await ShiftTemplate.updateOne({ _id: id, company }, { $set: { active: false } });
      return res.json({ message: '🔕 Template in use — deactivated instead of deleted.' });
    }

    await ShiftTemplate.deleteOne({ _id: id, company });
    return res.json({ message: '🗑️ Deleted permanently' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};
