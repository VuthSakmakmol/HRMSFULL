const express = require('express');
const router = express.Router();
const controller = require('../../controllers/ta/roadmapController');

router.get('/', controller.getRoadmaps);
router.get('/summary', controller.getSummary); // Optional dashboard
router.post('/', controller.createRoadmap);
router.put('/:id', controller.updateRoadmap);
router.delete('/:id', controller.deleteRoadmap);

module.exports = router;
