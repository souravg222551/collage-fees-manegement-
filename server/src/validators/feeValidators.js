const { body } = require('express-validator');

const collectFeeValidator = [
  body('studentId').notEmpty().withMessage('Student is required'),
  body('academicSession').trim().notEmpty().withMessage('Academic session is required'),
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be between 1 and 12'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('amountPaid')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount paid must be a positive number'),
  body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
  body('scholarship').optional().isFloat({ min: 0 }).withMessage('Scholarship must be a positive number'),
  body('fine').optional().isFloat({ min: 0 }).withMessage('Fine must be a positive number'),
];

module.exports = { collectFeeValidator };
