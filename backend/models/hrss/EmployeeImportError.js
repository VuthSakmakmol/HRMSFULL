const mongoose = require('mongoose');

const EmployeeImportErrorSchema = new mongoose.Schema({}, { strict: false });

module.exports = mongoose.model('EmployeeImportError', EmployeeImportErrorSchema);
