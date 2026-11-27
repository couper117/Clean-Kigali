// Staff login: checks the password and makes the token that proves who is calling.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../db/pool');
const config = require('../config/env');
const AppError = require('../utils/AppError');

// Cost of each bcrypt hash. Higher is slower to crack and slower to check; 10 takes
// well under 100 ms. Seeds and the users service hash with hashPassword() so every
// password uses the same cost.
const BCRYPT_ROUNDS = 10;

// Checked when the email is unknown, so a wrong email takes as long to answer as a
// wrong password and the response time does not reveal which emails have accounts.
const DUMMY_HASH = bcrypt.hashSync('no-account-has-this-password', BCRYPT_ROUNDS);

// Never select password_hash here: these columns are safe to send to clients.
const USER_COLUMNS = 'id, full_name, email, role, sector_id, is_active, created_at, updated_at';

// Database row (snake_case) -> API object (camelCase), without the password hash.
function toUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    sectorId: row.sector_id,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function login(email, password) {
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  const row = rows[0];

  const passwordMatches = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);
  // Same message for an unknown email and a wrong password, so neither is given away.
  if (!row || !passwordMatches) throw new AppError(401, 'Email or password is incorrect');
  if (!row.is_active) throw new AppError(403, 'This account is deactivated; ask an admin to reactivate it');

  const token = jwt.sign({ role: row.role }, config.jwtSecret, {
    subject: String(row.id),
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });

  return { token, tokenType: 'Bearer', expiresIn: config.jwtExpiresIn, user: toUser(row) };
}

// The user a token belongs to, or null if they were deleted or deactivated since logging in.
async function findActiveUser(id) {
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS} FROM users WHERE id = $1 AND is_active`,
    [id],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

module.exports = { login, findActiveUser, hashPassword, toUser, BCRYPT_ROUNDS };
