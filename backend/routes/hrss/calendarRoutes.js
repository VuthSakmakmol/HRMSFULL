const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  setCalendarDay,
  getCalendarDayTypes,
} = require('../../controllers/hrss/calendar');


// 🗓️ Upsert a single day’s type (Working / Sunday / Holiday / SpecialWorking)
router.put('/day', authenticate, authorizeCompanyAccess, setCalendarDay);

// 🗓️ Fetch day types for a range
router.get('/day-types', authenticate, authorizeCompanyAccess, getCalendarDayTypes);

module.exports = router;
