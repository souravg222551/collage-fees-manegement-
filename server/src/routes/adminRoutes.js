const express = require('express');
const router = express.Router();

const { getAdmins, createAdmin, setAdminStatus, deleteAdmin } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('SUPER_ADMIN'));

router.route('/').get(getAdmins).post(createAdmin);
router.put('/:id/status', setAdminStatus);
router.delete('/:id', deleteAdmin);

module.exports = router;
