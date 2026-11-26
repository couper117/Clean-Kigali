// Protects staff routes.
//   router.get('/', requireAuth, handler)                        any logged-in staff member
//   router.delete('/:id', requireAuth, requireRole('admin'), h)  admins only
const jwt = require('jsonwebtoken');

const config = require('../config/env');
const AppError = require('../utils/AppError');
const { findActiveUser } = require('../services/auth.service');

// Checks the "Authorization: Bearer <token>" header and puts the caller in req.user.
async function requireAuth(req, res, next) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  if (!match) {
    throw new AppError(401, 'Log in first, then send the header Authorization: Bearer <token>');
  }

  let payload;
  try {
    payload = jwt.verify(match[1], config.jwtSecret, { algorithms: ['HS256'] });
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(401, expired ? 'Your login has expired; log in again' : 'The login token is not valid');
  }
  if (!/^\d+$/.test(payload.sub || '')) throw new AppError(401, 'The login token is not valid');

  // Look the user up on every request, so deactivating an account takes effect at once
  // instead of when the token expires.
  const user = await findActiveUser(Number(payload.sub));
  if (!user) throw new AppError(401, 'This account no longer exists or is deactivated');

  req.user = user;
  next();
}

// Use after requireAuth. Lets the request through only for the given roles.
function requireRole(...roles) {
  return function checkRole(req, res, next) {
    if (!req.user) return next(new AppError(401, 'Log in first'));
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, `Only ${roles.join(' or ')} accounts can do this`));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
