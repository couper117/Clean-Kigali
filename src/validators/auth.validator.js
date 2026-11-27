// Checks the login body before it reaches the database.
// Answers 400 with one entry per invalid field, in the standard error format.
const AppError = require('../utils/AppError');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const details = [];

  if (typeof email !== 'string' || !EMAIL.test(email.trim()) || email.length > 254) {
    details.push({ field: 'email', message: 'Enter a valid email address' });
  }
  if (typeof password !== 'string' || password.length === 0) {
    details.push({ field: 'password', message: 'Password is required' });
  } else if (password.length > 72) {
    // bcrypt only reads the first 72 bytes; refuse longer ones instead of cutting them.
    details.push({ field: 'password', message: 'Password must be 72 characters or fewer' });
  }

  if (details.length) return next(new AppError(400, 'Some fields are not valid', details));

  req.body = { email: email.trim(), password };
  next();
}

module.exports = { validateLogin };
