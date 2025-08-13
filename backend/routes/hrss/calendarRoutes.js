const express = require('express');
const router = express.Router();

const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

const {
  setCalendarDay,
  getCalendarDayTypes,
  getMonthCalendar,
  bulkUpsert,
  bulkDelete,
} = require('../../controllers/hrss/calendarController');

// Single day set / range read
router.put('/day', authenticate, authorizeCompanyAccess, setCalendarDay);
router.get('/day-types', authenticate, authorizeCompanyAccess, getCalendarDayTypes);

// Month + bulk ops
router.get('/month', authenticate, authorizeCompanyAccess, getMonthCalendar);
router.post('/bulk-upsert', authenticate, authorizeCompanyAccess, bulkUpsert);
router.post('/bulk-delete', authenticate, authorizeCompanyAccess, bulkDelete);

module.exports = router;
