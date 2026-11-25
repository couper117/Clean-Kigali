// An error we throw on purpose, carrying the HTTP status code to send back.
// Example: throw new AppError(404, 'Report not found');
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
