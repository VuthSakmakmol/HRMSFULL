// backend/controllers/hrss/calendarController.js
const WorkCalendar = require('../../models/hrss/workCalendar');

/* ------------------------- helpers (local midnight) ------------------------- */
function atMidnightLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function parseY(y) {
  const n = parseInt(y, 10);
  return Number.isFinite(n) ? n : NaN;
}
function parseM(m) {
  const n = parseInt(m, 10);
  return Number.isFinite(n) ? n : NaN; // expect 1..12; we check below
}
function parseISODateToLocalMidnight(s) {
  // accepts 'YYYY-MM-DD' or Date
  const d = new Date(s);
  if (isNaN(d.valueOf())) return null;
  return atMidnightLocal(d);
}

/* --------------------------------- READ ONE -------------------------------- */
// GET /api/work-calendar/day-types?start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getCalendarDayTypes = async (req, res) => {
  try {
    const company = req.company;
    const start = parseISODateToLocalMidnight(req.query.start);
    const end   = parseISODateToLocalMidnight(req.query.end);
    if (!start || !end) {
      return res.status(400).json({ ok: false, message: 'Invalid start or end date' });
    }
    const docs = await WorkCalendar.find({
      company,
      date: { $gte: start, $lte: end }
    }).lean();
    res.json({ ok: true, data: docs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

/* ------------------------- MONTH GRID (no Day.js) -------------------------- */
// GET /api/work-calendar/month?year=2025&month=8  (month 1..12)
exports.getMonthCalendar = async (req, res) => {
  try {
    const company = req.company;
    const y = parseY(req.query.year);
    const m = parseM(req.query.month);

    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return res.status(400).json({ ok: false, message: 'Invalid year or month' });
    }

    // Local time month bounds
    const start = atMidnightLocal(new Date(y, m - 1, 1));
    const end   = atMidnightLocal(new Date(y, m, 1)); // first day of next month

    const docs = await WorkCalendar.find({
      company,
      date: { $gte: start, $lt: end }
    }).lean();

    res.json({ ok: true, year: y, month: m, data: docs });
  } catch (err) {
    console.error('getMonthCalendar error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

/* ------------------------------ SINGLE UPSERT ------------------------------ */
// PUT /api/work-calendar/day { date:'YYYY-MM-DD', dayType, note? }
exports.setCalendarDay = async (req, res) => {
  try {
    const { date, dayType, note = '' } = req.body;
    const company = req.company;
    if (!date || !dayType) {
      return res.status(400).json({ ok: false, message: 'date and dayType required' });
    }
    const d0 = parseISODateToLocalMidnight(date);
    if (!d0) return res.status(400).json({ ok: false, message: 'Invalid date format' });

    const doc = await WorkCalendar.findOneAndUpdate(
      { company, date: d0 },
      { dayType, note },
      { upsert: true, new: true }
    );
    res.json({ ok: true, data: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

/* --------------------------------- BULK UPSERT ----------------------------- */
// POST /api/work-calendar/bulk-upsert { dates:['YYYY-MM-DD',...], dayType, note? }
exports.bulkUpsert = async (req, res) => {
  try {
    const company = req.company;
    const { dates, dayType, note = '' } = req.body;

    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ ok: false, message: 'dates[] required' });
    }
    if (!dayType) {
      return res.status(400).json({ ok: false, message: 'dayType required' });
    }

    const ops = [];
    const invalid = [];

    for (const s of dates) {
      const d0 = parseISODateToLocalMidnight(s);
      if (!d0) { invalid.push(s); continue; }
      ops.push({
        updateOne: {
          filter: { company, date: d0 },
          update: { $set: { dayType, note } },
          upsert: true
        }
      });
    }

    if (ops.length) await WorkCalendar.bulkWrite(ops);
    res.json({ ok: true, upserted: ops.length, invalid });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

/* --------------------------------- BULK DELETE ----------------------------- */
// POST /api/work-calendar/bulk-delete { dates:['YYYY-MM-DD', ...] }
exports.bulkDelete = async (req, res) => {
  try {
    const company = req.company;
    const { dates } = req.body;
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ ok: false, message: 'dates[] required' });
    }
    const keys = [];
    const invalid = [];
    for (const s of dates) {
      const d0 = parseISODateToLocalMidnight(s);
      if (!d0) { invalid.push(s); continue; }
      keys.push(d0);
    }
    if (keys.length) {
      await WorkCalendar.deleteMany({ company, date: { $in: keys } });
    }
    res.json({ ok: true, deleted: keys.length, invalid });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
