// controllers/hrss/_helpers/shiftLookup.js
const ShiftTemplate = require('../../../models/hrss/shiftTemplate');

/**
 * Smarter shift template finder.
 * Tries: exact → code → case-insensitive partial → keyword match (day/night/morning/evening)
 */
async function findTemplate(company, label) {
  if (!company || !label) return null;

  const text = String(label).trim();
  if (!text) return null;

  // Normalize (e.g. “Day Shift” → “day”)
  const canonical = text.toLowerCase();

  // 1️⃣ Exact match (case-insensitive)
  let tpl = await ShiftTemplate.findOne({
    company,
    active: true,
    name: { $regex: new RegExp(`^${canonical}$`, 'i') },
  }).lean();
  if (tpl) return tpl;

  // 2️⃣ Match by code (if template has code)
  tpl = await ShiftTemplate.findOne({
    company,
    active: true,
    code: { $regex: new RegExp(`^${canonical}$`, 'i') },
  }).lean();
  if (tpl) return tpl;

  // 3️⃣ Partial match (contains)
  tpl = await ShiftTemplate.findOne({
    company,
    active: true,
    $or: [
      { name: { $regex: canonical, $options: 'i' } },
      { code: { $regex: canonical, $options: 'i' } },
    ],
  }).lean();
  if (tpl) return tpl;

  // 4️⃣ Keyword-based heuristic match
  const keywords = [
    { key: ['day', 'morning', 'a'], match: /day|morning|a/i },
    { key: ['night', 'evening', 'b'], match: /night|evening|b/i },
    { key: ['swing'], match: /swing/i },
    { key: ['line'], match: /line/i },
  ];

  for (const k of keywords) {
    if (k.match.test(canonical)) {
      const t = await ShiftTemplate.findOne({
        company,
        active: true,
        $or: [
          { name: { $regex: k.key.join('|'), $options: 'i' } },
          { code: { $regex: k.key.join('|'), $options: 'i' } },
        ],
      }).lean();
      if (t) return t;
    }
  }

  // 5️⃣ Nothing matched
  return null;
}

module.exports = { findTemplate };
