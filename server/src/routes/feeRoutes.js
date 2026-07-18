const express = require('express');
const router = express.Router();

const {
  collectFee,
  getFeePayments,
  getFeePaymentById,
  updateFeePayment,
  deleteFeePayment,
} = require('../controllers/feeController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { collectFeeValidator } = require('../validators/feeValidators');

router.use(protect);

router.route('/').get(getFeePayments).post(collectFeeValidator, validate, collectFee);

router.route('/:id').get(getFeePaymentById).put(updateFeePayment).delete(deleteFeePayment);

module.exports = router;
