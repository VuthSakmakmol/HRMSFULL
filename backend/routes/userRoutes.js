const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const userController = require('../controllers/userController');

// GM-only access
router.get('/emails', authenticate, authorize(['GeneralManager', 'Manager']), userController.getUserEmails);
router.get('/', authenticate, authorize(['GeneralManager']), userController.getAll);
router.post('/', authenticate, authorize(['GeneralManager']), userController.create);
router.put('/:id', authenticate, authorize(['GeneralManager']), userController.update);
router.delete('/:id', authenticate, authorize(['GeneralManager']), userController.remove);

module.exports = router;
