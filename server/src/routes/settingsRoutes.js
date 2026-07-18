const express = require('express');
const router = express.Router();

const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const { uploadLogo } = require('../middleware/upload');

router.use(protect);

router.get('/', getSettings);
router.put('/', authorize('SUPER_ADMIN', 'ADMIN'), uploadLogo.single('logo'), updateSettings);

module.exports = router;
