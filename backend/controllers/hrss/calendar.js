const WorkCalendar = require('../../models/hrss/workCalendar');

function atMidnightLocal(x){ const d=new Date(x); d.setHours(0,0,0,0); return d; }

// PUT /api/calendar/day
// body: { date: 'YYYY-MM-DD', dayType: 'Working'|'Sunday'|'Holiday'|'SpecialWorking', description? }
exports.setCalendarDay = async (req, res) => {
  try {
    const { date, dayType, description = '' } = req.body;
    const company = req.company;
    if (!date || !dayType) return res.status(400).json({ message: 'date and dayType required' });

    const d0 = atMidnightLocal(new Date(date));
    const doc = await WorkCalendar.findOneAndUpdate(
      { company, date: d0 },
      { dayType, description },
      { upsert: true, new: true }
    );
    res.json({ ok: true, data: doc });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET /api/calendar/day-types?start=YYYY-MM-DD&end=YYYY-MM-DD
exports.getCalendarDayTypes = async (req, res) => {
  try {
    const company = req.company;
    const start = atMidnightLocal(new Date(req.query.start));
    const end   = atMidnightLocal(new Date(req.query.end));
    const docs  = await WorkCalendar.find({ company, date: { $gte: start, $lte: end } });
    res.json({ ok: true, data: docs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
};
