const express = require('express')
const router = express.Router()
const { getReport } = require('../../controllers/ta/reportController')

router.get('/', getReport)

module.exports = router
