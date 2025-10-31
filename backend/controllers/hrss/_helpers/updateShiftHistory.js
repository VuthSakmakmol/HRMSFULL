// controllers/hrss/_helpers/updateShiftHistory.js
/* eslint-disable no-console */
const mongoose = require('mongoose');
let ShiftAssignment;

try {
  ShiftAssignment = require('../../../models/hrss/shiftAssignment');
} catch (e) {
  try {
    ShiftAssignment = mongoose.model('ShiftAssignment');
  } catch (_) { /* noop */ }
}

/**
 * Update shiftHistory and ShiftAssignment when an employee’s shift changes.
 */
exports.updateShiftHistory = async ({
  company,
  emp,
  newShiftTemplateId,
  effectiveFrom,
  user
}) => {
  try {
    if (!emp || !newShiftTemplateId) return;

    const now = new Date(effectiveFrom || new Date());

    /* ---------- 1️⃣ Close current open shift ---------- */
    if (emp.shiftHistory?.length) {
      const open = emp.shiftHistory.find(h => !h.to);
      if (open) open.to = now;
    }

    /* ---------- 2️⃣ Add new shift record ---------- */
    emp.shiftHistory.push({
      shiftTemplateId: newShiftTemplateId,
      from: now,
      to: null,
    });

    /* ---------- 3️⃣ Sync ShiftAssignment collection ---------- */
    if (ShiftAssignment) {
      await ShiftAssignment.updateMany(
        { company, employeeId: emp.employeeId, to: null },
        { $set: { to: now } }
      );

      await ShiftAssignment.create({
        company,
        employeeId: emp.employeeId,
        shiftTemplateId: newShiftTemplateId,
        from: now,
        to: null,
        reason: 'Shift changed (auto)',
        updatedBy: user || 'System',
      });
    }

    /* ---------- 4️⃣ Save employee ---------- */
    await emp.save();

  } catch (err) {
    console.error('[updateShiftHistory ERROR]', err);
  }
};
