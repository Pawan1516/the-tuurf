// Unified Response Handler for consistent API responses

const responseHandler = {
  // Success response
  success: (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data: data || null,
      timestamp: new Date().toISOString(),
    });
  },

  // Error response
  error: (res, message = 'Error', statusCode = 500, errors = null) => {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors: errors || null,
      timestamp: new Date().toISOString(),
    });
  },

  // Paginated response
  paginated: (res, data, pagination, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
      },
      timestamp: new Date().toISOString(),
    });
  },

  // Created response (201)
  created: (res, data, message = 'Created successfully') => {
    return responseHandler.success(res, data, message, 201);
  },

  // Accepted response (202)
  accepted: (res, data, message = 'Request accepted') => {
    return responseHandler.success(res, data, message, 202);
  },

  // No content response (204)
  noContent: (res) => {
    return res.status(204).send();
  },

  // Not found response (404)
  notFound: (res, message = 'Resource not found') => {
    return responseHandler.error(res, message, 404);
  },

  // Validation error (400)
  validationError: (res, message = 'Validation error', errors = null) => {
    return responseHandler.error(res, message, 400, errors);
  },

  // Unauthorized (401)
  unauthorized: (res, message = 'Unauthorized') => {
    return responseHandler.error(res, message, 401);
  },

  // Forbidden (403)
  forbidden: (res, message = 'Forbidden') => {
    return responseHandler.error(res, message, 403);
  },

  // Conflict (409)
  conflict: (res, message = 'Resource already exists') => {
    return responseHandler.error(res, message, 409);
  },

  // Server error (500)
  serverError: (res, message = 'Internal server error') => {
    return responseHandler.error(res, message, 500);
  },

  // Service unavailable (503)
  serviceUnavailable: (res, message = 'Service unavailable') => {
    return responseHandler.error(res, message, 503);
  },
};

module.exports = responseHandler;
