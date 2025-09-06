// controllers/hrss/_helpers/shiftLookup.js
const ShiftTemplate = require('../../../models/hrss/shiftTemplate');

/**
 * Find an active ShiftTemplate for a company that matches a canonical label.
 * - Tries exact name match first
 * - Then tries exact code match
 * - Then fuzzy name contains "day"/"night" if canonical hints those
 * Returns the lean() doc or null.
 *
 * @param {string} company
 * @param {string} canonical - e.g. "Day Shift", "Night Shift", or a concrete template name/code
 */
async function findTemplate(company, canonical) {
  if (!company || !canonical) return null;

  // Prefer exact NAME match
  let t = await ShiftTemplate.findOne({
    company,
    active: true,
    name: canonical
  }).lean();
  if (t) return t;

  // Try exact CODE match next (if you use codes)
  t = await ShiftTemplate.findOne({
    company,
    active: true,
    code: canonical
  }).lean();
  if (t) return t;

  // Fallback fuzzy: detect "day"/"night" and search by name contains
  const isNight = /night/i.test(canonical);
  const isDay   = /day/i.test(canonical);

  if (isNight || isDay) {
    t = await ShiftTemplate.findOne({
      company,
      active: true,
      name: { $regex: isNight ? 'night' : 'day', $options: 'i' },
    }).lean();
    if (t) return t;
  }

  // Final fallback: loose regex on name OR code
  t = await ShiftTemplate.findOne({
    company,
    active: true,
    $or: [
      { name: { $regex: canonical, $options: 'i' } },
      { code: { $regex: canonical, $options: 'i' } },
    ],
  }).lean();

  return t || null;
}

module.exports = { findTemplate };
