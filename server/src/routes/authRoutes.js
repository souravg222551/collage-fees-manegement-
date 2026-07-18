const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const { login, logout, getMe, changePassword, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginValidator, changePasswordValidator } = require('../validators/authValidators');
const { uploadLogo } = require('../middleware/upload');

// Throttle login attempts to slow brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, loginValidator, validate, login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePasswordValidator, validate, changePassword);
router.put('/profile', protect, uploadLogo.single('avatar'), updateProfile);

module.exports = router;
