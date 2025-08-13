// src/plugins/dayjs.js
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Default all Day.js operations to Phnom Penh
dayjs.tz.setDefault('Asia/Phnom_Penh');

export default dayjs;
