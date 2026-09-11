class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR", details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(m = "Bad request", d) { super(m, 400, "BAD_REQUEST", d); }
}
class UnauthorizedError extends AppError {
  constructor(m = "Unauthorized", d) { super(m, 401, "UNAUTHORIZED", d); }
}
class ForbiddenError extends AppError {
  constructor(m = "Forbidden", d) { super(m, 403, "FORBIDDEN", d); }
}
class NotFoundError extends AppError {
  constructor(m = "Not found", d) { super(m, 404, "NOT_FOUND", d); }
}
class ConflictError extends AppError {
  constructor(m = "Conflict", d) { super(m, 409, "CONFLICT", d); }
}

module.exports = {
  AppError, BadRequestError, UnauthorizedError,
  ForbiddenError, NotFoundError, ConflictError,
};