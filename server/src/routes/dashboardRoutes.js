const express = require('express');
const router = express.Router();

const {
  getStats,
  getMonthlyCollection,
  getPaymentStatusBreakdown,
  getCollectionBySemester,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/stats', getStats);
router.get('/monthly-collection', getMonthlyCollection);
router.get('/payment-status', getPaymentStatusBreakdown);
router.get('/collection-by-semester', getCollectionBySemester);

module.exports = router;
