const express = require('express');
const router = express.Router();
const constants = require('../../models/hrss/constants');

// Return enums from constants
router.get('/enums', (req, res) => {
  res.json(constants);
});

module.exports = router;
