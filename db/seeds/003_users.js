// CK001-17: one admin and two officers. Accounts that already exist are left as
// they are, so running the seed again never resets a password someone changed.
const { hashPassword } = require('../../src/services/auth.service');

const USERS = [
  { fullName: 'Jean Bosco Niyonzima', email: 'admin@cleankigali.rw', role: 'admin', sector: null },
  { fullName: 'Aline Uwase', email: 'officer.gasabo@cleankigali.rw', role: 'officer', sector: 'Kimironko' },
  { fullName: 'Patrick Mugabo', email: 'officer.nyarugenge@cleankigali.rw', role: 'officer', sector: 'Nyamirambo' },
];

module.exports = async function seedUsers(client, { password, log }) {
  const hash = await hashPassword(password);
  for (const user of USERS) {
    const { rowCount } = await client.query(
      `INSERT INTO users (full_name, email, password_hash, role, sector_id)
       VALUES ($1, $2, $3, $4, (SELECT id FROM sectors WHERE name = $5))
       ON CONFLICT ((lower(email))) DO NOTHING`,
      [user.fullName, user.email, hash, user.role, user.sector],
    );
    log(`${rowCount ? 'added  ' : 'kept   '} ${user.role} ${user.email}`);
  }
};
