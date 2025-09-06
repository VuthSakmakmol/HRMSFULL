// controllers/hrss/shiftTemplateController.js
const ShiftTemplate     = require('../../models/hrss/shiftTemplate');
const ShiftAssignment   = require('../../models/hrss/shiftAssignment');

/* ───────────────────────── Helpers ───────────────────────── */

const HHMM = /^\d{2}:\d{2}$/;
const asUndef = v => (v === '' || v === null ? undefined : v);

const isHHmm = v => HHMM.test(String(v || ''));

const err400 = (res, message, extra = {}) =>
  res.status(400).json({ message, ...extra });

/** compare "HH:mm" on anchor date */
const toDate = (hhmm, addDay = 0) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  const d = new Date(Date.UTC(2000, 0, 1 + addDay, h, m, 0, 0));
  return d;
};

/** returns negative/zero/positive like Date - Date */
const cmpHHmm = (a, b) => toDate(a) - toDate(b);

/** prepare+validate request body → normalized payload (or throw Error) */
function buildPayload(raw) {
  const body = raw || {};
  const payload = {
    company: undefined, // filled by caller
    name: asUndef(body.name),
    code: asUndef(body.code),
    active: body.active ?? true,
    version: body.version ?? 1,
    effectiveFrom: asUndef(body.effectiveFrom),
    effectiveTo: asUndef(body.effectiveTo),

    timeIn: asUndef(body.timeIn),
    lateAfter: asUndef(body.lateAfter),
    timeOut: asUndef(body.timeOut),

    // NEW: accept crossMidnight at top-level for convenience
    crossMidnight: !!body.crossMidnight,

    // window is optional object: { earliestIn?, latestIn? }
    window: body.window ? {
      earliestIn: asUndef(body.window.earliestIn),
      latestIn:   asUndef(body.window.latestIn)
    } : undefined,

    // breaks: [{ start, end, paid?, otMode?, otAfterMin? }]
    breaks: Array.isArray(body.breaks) ? body.breaks.map(b => ({
      start: asUndef(b.start),
      end: asUndef(b.end),
      paid: !!b.paid,
      otMode: asUndef(b.otMode) || 'ANY_MINUTES',
      otAfterMin: Number(b.otAfterMin || 0)
    })) : [],

    // OT block (optional)
    ot: body.ot ? {
      mode: asUndef(body.ot.mode) || 'DISABLED',
      startAfterMin: Number(body.ot.startAfterMin || 0),
      roundingMin: Number(body.ot.roundingMin || 0),
      tiers: Array.isArray(body.ot.tiers) ? body.ot.tiers : []
    } : { mode:'DISABLED', startAfterMin:0, roundingMin:0, tiers:[] },

    daysOfWeek: Array.isArray(body.daysOfWeek) ? body.daysOfWeek : [],
    excludeHolidays: !!body.excludeHolidays
  };

  /* ─────────── field-level checks with precise messages ─────────── */
  if (!payload.name || !String(payload.name).trim())
    throw new Error('name is required');

  // core times
  ['timeIn','lateAfter','timeOut'].forEach(f => {
    if (!isHHmm(payload[f])) throw new Error(`${f} must be HH:mm`);
  });

  // lateAfter ≥ timeIn
  if (cmpHHmm(payload.lateAfter, payload.timeIn) < 0)
    throw new Error('lateAfter must be ≥ timeIn');

  // optional window
  if (payload.window) {
    const { earliestIn, latestIn } = payload.window;
    if (earliestIn && !isHHmm(earliestIn)) throw new Error('window.earliestIn must be HH:mm');
    if (latestIn   && !isHHmm(latestIn))   throw new Error('window.latestIn must be HH:mm');

    if (earliestIn && cmpHHmm(payload.timeIn, earliestIn) < 0)
      throw new Error('timeIn must be ≥ window.earliestIn');

    if (latestIn && cmpHHmm(latestIn, payload.timeIn) < 0)
      throw new Error('window.latestIn must be ≥ timeIn');
  }

  // timeOut rule: if not crossMidnight, timeOut ≥ timeIn
  if (!payload.crossMidnight && cmpHHmm(payload.timeOut, payload.timeIn) < 0)
    throw new Error('timeOut must be ≥ timeIn unless crossMidnight is true');

  // breaks
  payload.breaks.forEach((br, i) => {
    if (!isHHmm(br.start) || !isHHmm(br.end))
      throw new Error(`breaks[${i}].start/end must be HH:mm`);
    const sameDay = cmpHHmm(br.end, br.start) > 0;
    if (!sameDay && !payload.crossMidnight) {
      throw new Error(`breaks[${i}] end must be after start (or enable crossMidnight)`);
    }
    if (br.otAfterMin < 0) throw new Error(`breaks[${i}].otAfterMin must be ≥ 0`);
  });

  return payload;
}

/* ───────────────────────── Controllers ───────────────────────── */

exports.createShiftTemplate = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    payload.company = req.company;

    const doc = new ShiftTemplate(payload);
    await doc.validate();
    const saved = await doc.save();
    return res.status(201).json(saved);
  } catch (err) {
    // surface first Mongoose validation error if present
    const first = err?.errors ? Object.values(err.errors)[0]?.message : null;
    return err400(res, 'Create failed', { error: first || err.message });
  }
};

exports.listShiftTemplates = async (req, res) => {
  try {
    const company = req.company;
    const { active, q } = req.query;
    const filter = { company };
    if (active === 'true')  filter.active = true;
    if (active === 'false') filter.active = false;
    if (q) filter.name = { $regex: q, $options: 'i' };
    const rows = await ShiftTemplate.find(filter).sort({ name: 1 });
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ message: 'List failed', error: err.message });
  }
};

exports.getShiftTemplate = async (req, res) => {
  try {
    const row = await ShiftTemplate.findOne({ _id: req.params.id, company: req.company });
    if (!row) return res.status(404).json({ message: 'Not found' });
    return res.json(row);
  } catch (err) {
    return res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

exports.updateShiftTemplate = async (req, res) => {
  try {
    const company = req.company;
    const existing = await ShiftTemplate.findOne({ _id: req.params.id, company });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const payload = buildPayload(req.body);
    // preserve company & _id
    delete payload.company;

    // assign fields (whitelist)
    [
      'name','code','active','version','effectiveFrom','effectiveTo',
      'timeIn','lateAfter','timeOut','crossMidnight','breaks','window',
      'ot','daysOfWeek','excludeHolidays'
    ].forEach(k => { if (payload[k] !== undefined) existing[k] = payload[k]; });

    await existing.validate();
    const saved = await existing.save();
    return res.json({ message: '✅ Updated', data: saved });
  } catch (err) {
    const first = err?.errors ? Object.values(err.errors)[0]?.message : null;
    return err400(res, 'Update failed', { error: first || err.message });
  }
};

exports.deleteShiftTemplate = async (req, res) => {
  try {
    const company = req.company;
    const id = req.params.id;

    const inUse = await ShiftAssignment.exists({ company, shiftTemplateId: id });
    if (inUse) {
      await ShiftTemplate.updateOne({ _id: id, company }, { $set: { active: false } });
      return res.json({ message: '🔕 Template in use → set active=false (soft-deleted)' });
    }

    await ShiftTemplate.deleteOne({ _id: id, company });
    return res.json({ message: '🗑️ Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Delete failed', error: err.message });
  }
};
