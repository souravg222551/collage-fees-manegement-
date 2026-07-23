const { body } = require('express-validator');

// Core fields required regardless of institution type (college or school).
const studentValidator = [
  body('rollNumber').trim().notEmpty().withMessage('Roll number is required'),
  body('enrollmentNumber').trim().notEmpty().withMessage('Enrollment number is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('fathersName').trim().notEmpty().withMessage("Father's name is required"),
  body('mothersName').trim().notEmpty().withMessage("Mother's name is required"),
  body('dob').isISO8601().withMessage('A valid date of birth is required'),
  body('mobile')
    .trim()
    .matches(/^[0-9+\-\s]{7,15}$/)
    .withMessage('A valid mobile number is required'),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('section').trim().notEmpty().withMessage('Section is required'),
  body('academicSession').trim().notEmpty().withMessage('Academic session is required'),
  body('aadharNumber')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{12}$/)
    .withMessage('Aadhaar number must be exactly 12 digits'),

  // College-mode fields — optional at the schema level (a school record won't
  // send these), but if they ARE sent, they must not be empty strings.
  body('department').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Department cannot be empty'),
  body('course').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Course cannot be empty'),
  body('branch').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Branch cannot be empty'),
  body('semester').optional({ checkFalsy: true }).isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),

  // School-mode fields — same treatment.
  body('grade').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Grade/Class cannot be empty'),
  body('stream').optional({ checkFalsy: true }).trim(),
];

module.exports = { studentValidator };
