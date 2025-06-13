// models/Location.js
const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  provinceNameKh: String,
  districtNameKh: String,
  communeNameKh: String,
  villageNameKh: String
});

module.exports = mongoose.model('Location', locationSchema);
