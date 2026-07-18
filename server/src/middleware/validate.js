const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after express-validator chains; throws a 422 with field-level errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    throw new ApiError(422, 'Validation failed', formatted);
  }
  next();
};

module.exports = validate;
