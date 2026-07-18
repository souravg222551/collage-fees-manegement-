const express = require('express');
const router = express.Router();

const { generateReport, exportCsv, exportPdf } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', generateReport);
router.get('/export/csv', exportCsv);
router.get('/export/pdf', exportPdf);

module.exports = router;
