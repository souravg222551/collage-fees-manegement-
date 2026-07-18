const ApiError = require('../utils/ApiError');

// Converts known error types (Prisma, JWT, Multer) into ApiError instances
const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  // Prisma known request errors
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return new ApiError(409, `A record with this ${field} already exists.`);
  }
  if (err.code === 'P2025') {
    return new ApiError(404, 'Requested record was not found.');
  }
  if (err.code === 'P2003') {
    return new ApiError(409, 'This record is referenced by other data and cannot be modified.');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid authentication token.');
  }
  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Session expired. Please log in again.');
  }

  // Multer errors
  if (err.name === 'MulterError') {
    return new ApiError(400, `File upload error: ${err.message}`);
  }

  return new ApiError(err.statusCode || 500, err.message || 'Internal server error');
};

// 404 handler for unmatched routes
const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Centralized error handler — must be registered last
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);

  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
