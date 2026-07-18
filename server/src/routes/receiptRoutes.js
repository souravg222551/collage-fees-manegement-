const express = require('express');
const router = express.Router();

const { getReceipt, getReceipts, downloadReceiptPdf } = require('../controllers/receiptController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getReceipts);
router.get('/:id', getReceipt);
router.get('/:id/pdf', downloadReceiptPdf);

module.exports = router;
