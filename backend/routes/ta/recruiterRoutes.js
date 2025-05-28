// routes/recruiterRoutes.js
const express = require('express')
const router = express.Router()
const Recruiter = require('../../models/ta/Recruiter')

router.get('/', async (req, res) => {
  try {
    const { company } = req.query
    if (!company) return res.status(400).json({ message: 'Company is required' })

    const recruiters = await Recruiter.find({ company: company.trim().toUpperCase() })
    res.json(recruiters)
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch recruiters', error: err.message })
  }
})

module.exports = router
