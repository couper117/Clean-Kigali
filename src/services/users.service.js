// Staff accounts, managed by admins. The password hash never leaves this file.
const db = require('../db/pool');
const AppError = require('../utils/AppError');
const { hashPassword, toUser, USER_COLUMNS } = require('./auth.service');

async function list({ role, isActive } = {}) {
  const { rows } = await db.query(
    `SELECT ${USER_COLUMNS} FROM users
      WHERE ($1::text IS NULL OR role = $1)
        AND ($2::boolean IS NULL OR is_active = $2)
      ORDER BY full_name, id`,
    [role ?? null, isActive ?? null],
  );
  return rows.map(toUser);
}

async function getById(id) {
  const { rows } = await db.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError(404, 'User not found');
  return toUser(rows[0]);
}

async function checkSector(sectorId) {
  if (!sectorId) return;
  const { rows } = await db.query('SELECT 1 FROM sectors WHERE id = $1', [sectorId]);
  if (!rows.length) {
    throw new AppError(400, 'Some fields are not valid', [
      { field: 'sectorId', message: `There is no sector with id ${sectorId}` },
    ]);
  }
}

// Emails are unique ignoring case (index users_email_key on lower(email)).
function duplicateEmail(err, email) {
  if (err.code === '23505' && err.constraint === 'users_email_key') {
    return new AppError(409, `A staff account with the email ${email} already exists`);
  }
  return err;
}

async function create({ fullName, email, password, role, sectorId = null }) {
  await checkSector(sectorId);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, sector_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING ${USER_COLUMNS}`,
      [fullName, email, await hashPassword(password), role, sectorId],
    );
    return toUser(rows[0]);
  } catch (err) {
    throw duplicateEmail(err, email);
  }
}

// An admin may not take away their own admin role or deactivate themselves, so
// the system cannot be left without anyone able to manage it.
function protectSelf(currentUser, id, { role, isActive }) {
  if (currentUser.id !== id) return;
  if (role !== undefined && role !== 'admin') {
    throw new AppError(409, 'You cannot remove your own admin role; ask another admin');
  }
  if (isActive === false) {
    throw new AppError(409, 'You cannot deactivate your own account; ask another admin');
  }
}

async function replace(currentUser, id, changes) {
  protectSelf(currentUser, id, changes);
  await getById(id);
  await checkSector(changes.sectorId);

  // password and isActive change only when they are sent.
  const passwordHash = changes.password ? await hashPassword(changes.password) : null;
  try {
    const { rows } = await db.query(
      `UPDATE users
          SET full_name = $1, email = $2, role = $3, sector_id = $4,
              password_hash = COALESCE($5, password_hash),
              is_active = COALESCE($6, is_active),
              updated_at = now()
        WHERE id = $7
        RETURNING ${USER_COLUMNS}`,
      [changes.fullName, changes.email, changes.role, changes.sectorId,
        passwordHash, changes.isActive ?? null, id],
    );
    if (!rows.length) throw new AppError(404, 'User not found');
    return toUser(rows[0]);
  } catch (err) {
    throw duplicateEmail(err, changes.email);
  }
}

// Deactivates instead of deleting: the account's name stays on the report history
// it is part of, but it can no longer log in (its tokens stop working at once).
// PUT with isActive true brings it back.
async function deactivate(currentUser, id) {
  protectSelf(currentUser, id, { isActive: false });
  const { rowCount } = await db.query(
    'UPDATE users SET is_active = false, updated_at = now() WHERE id = $1',
    [id],
  );
  if (rowCount === 0) throw new AppError(404, 'User not found');
}

module.exports = { list, getById, create, replace, deactivate };
