const express = require('express');
const router = express.Router();
const Location = require('../../models/hrss/Location');

// ✅ Get all unique provinces
router.get('/provinces', async (req, res) => {
  try {
    const provinces = await Location.distinct('provinceNameKh');
    res.json(provinces);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch provinces' });
  }
});

// ✅ Get districts by province
router.get('/districts', async (req, res) => {
  const { province } = req.query;
  if (!province) return res.status(400).json({ error: 'Missing province' });

  try {
    const districts = await Location.find({ provinceNameKh: province }).distinct('districtNameKh');
    res.json(districts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
});

// ✅ Get communes by province + district
router.get('/communes', async (req, res) => {
  const { province, district } = req.query;
  if (!province || !district) {
    return res.status(400).json({ error: 'Missing province or district' });
  }

  try {
    const communes = await Location.find({
      provinceNameKh: province,
      districtNameKh: district
    }).distinct('communeNameKh');
    res.json(communes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch communes' });
  }
});

// ✅ Get villages by province + district + commune
router.get('/villages', async (req, res) => {
  const { province, district, commune } = req.query;
  if (!province || !district || !commune) {
    return res.status(400).json({ error: 'Missing province, district, or commune' });
  }

  try {
    const villages = await Location.find({
      provinceNameKh: province,
      districtNameKh: district,
      communeNameKh: commune,
      villageNameKh: { $ne: null }  // Only return filled villages
    }).distinct('villageNameKh');
    res.json(villages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch villages' });
  }
});

// ✅ Update a blank village with new name
router.patch('/village', async (req, res) => {
  const { province, district, commune, village } = req.body;

  if (!province || !district || !commune || !village) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const updated = await Location.findOneAndUpdate(
      {
        provinceNameKh: province,
        districtNameKh: district,
        communeNameKh: commune,
        villageNameKh: null
      },
      { villageNameKh: village },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'No blank village found to update' });
    }

    res.json({ message: 'Village updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update village', details: err.message });
  }
});


// GET /api/location/reverse?commune=Tonle Bassac
router.get('/reverse', async (req, res) => {
  const { commune } = req.query;
  const data = await Location.findOne({ communeNameKh: commune });
  if (!data) return res.status(404).json({ error: 'Commune not found' });
  res.json({
    provinceNameKh: data.provinceNameKh,
    districtNameKh: data.districtNameKh,
    communeNameKh: data.communeNameKh
  });
});


module.exports = router;
