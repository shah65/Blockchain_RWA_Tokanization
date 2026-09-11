const logger  = require("../utils/logger");
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let code = err.code || "INTERNAL_ERROR";
  let message = err.message || "Internal server error";
  let details = err.details;
  // Normalize common error families into clean API responses
  if (err.name === "ZodError") {
    statusCode = 422; code = "VALIDATION_ERROR"; message = "Invalid request data";
    details = err.issues?.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401; code = "INVALID_TOKEN"; message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401; code = "TOKEN_EXPIRED"; message = "Token expired";
  } else if (typeof err.code === "string" && /^23/.test(err.code)) {
    // Postgres unique/FK/not-null violations surface through supabase-js
    statusCode = 409; code = "DB_CONSTRAINT_VIOLATION"; message = "Databaseconstraint violation";
  } else if (err.code === "PGRST116") {
    statusCode = 404; code = "NOT_FOUND"; message = "Resource not found";
  } if (statusCode >= 500) logger.error(err.stack || message);
  else logger.warn(`${statusCode} ${code}: ${message}`);
  res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
    ...(process.env.NODE_ENV !== "production" && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}
module.exports = { errorHandler };