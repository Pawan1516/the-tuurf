const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error(`Error: ${err.message}`);

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found: invalid ID format'
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: `Registry rejection: ${messages.join(', ')}`
    });
  }

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
