// backend/routes/ta/recruiterRoutes.js
const express = require('express');
const router = express.Router();
const Recruiter = require('../../models/ta/Recruiter');
const { authenticate } = require('../../middlewares/authMiddleware');
const { authorizeCompanyAccess } = require('../../middlewares/roleMiddleware');

router.get(
  '/',
  authenticate,
  authorizeCompanyAccess,
  async (req, res) => {
    try {
      const company = req.company;
      if (!company) {
        return res.status(400).json({ message: 'Company is required' });
      }

      const recruiters = await Recruiter.find({ company });
      res.json(recruiters);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch recruiters', error: err.message });
    }
  }
);

module.exports = router;
