const { body } = require('express-validator');

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
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('course').trim().notEmpty().withMessage('Course is required'),
  body('branch').trim().notEmpty().withMessage('Branch is required'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
  body('section').trim().notEmpty().withMessage('Section is required'),
  body('academicSession').trim().notEmpty().withMessage('Academic session is required'),
];

module.exports = { studentValidator };
