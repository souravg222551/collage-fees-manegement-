const express = require('express');
const router = express.Router();

const {
  getGroups,
  getStructure,
  addItem,
  updateItem,
  deleteItem,
  getStudentSummary,
  syncCharges,
} = require('../controllers/feeStructureController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Viewing is allowed for everyone authenticated (Accountants need this
// while collecting fees); editing the structure is Admin/Super Admin only.
router.get('/groups', getGroups);
router.get('/summary/:studentId', getStudentSummary);
router.get('/', getStructure);
router.post('/', authorize('SUPER_ADMIN', 'ADMIN'), addItem);
router.put('/:id', authorize('SUPER_ADMIN', 'ADMIN'), updateItem);
router.delete('/:id', authorize('SUPER_ADMIN', 'ADMIN'), deleteItem);
router.post('/sync-charges', authorize('SUPER_ADMIN', 'ADMIN'), syncCharges);

module.exports = router;
