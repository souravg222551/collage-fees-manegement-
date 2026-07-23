const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  getOptionalCatalog,
  getStudentFeeItems,
  addStudentFeeItem,
  deleteStudentFeeItem,
} = require('../controllers/studentFeeItemController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/catalog', getOptionalCatalog);
router.route('/').get(getStudentFeeItems).post(authorize('SUPER_ADMIN', 'ADMIN'), addStudentFeeItem);
router.delete('/:itemId', authorize('SUPER_ADMIN', 'ADMIN'), deleteStudentFeeItem);

module.exports = router;
