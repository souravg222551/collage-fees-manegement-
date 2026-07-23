const express = require('express');
const router = express.Router();

const {
  collectFee,
  collectFeeBulk,
  getFeePayments,
  getFeePaymentById,
  updateFeePayment,
  deleteFeePayment,
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { collectFeeValidator } = require('../validators/feeValidators');

router.use(protect);

// Collecting and editing fee payments is core Accountant work — allowed for
// SUPER_ADMIN, ADMIN, and ACCOUNTANT alike.
router.route('/').get(getFeePayments).post(collectFeeValidator, validate, collectFee);
router.post('/bulk', collectFeeBulk);

router
  .route('/:id')
  .get(getFeePaymentById)
  .put(updateFeePayment)
  .delete(authorize('SUPER_ADMIN', 'ADMIN'), deleteFeePayment);

module.exports = router;
