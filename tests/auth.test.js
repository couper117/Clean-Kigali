// Login, /me and role checks against the test database.
const { api, pool, resetDatabase, authAs, PASSWORD, ADMIN, OFFICER } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

before(resetDatabase);
after(() => pool.end());

test('the right password gives a token and the user, without the hash', async () => {
  const res = await api().post('/api/auth/login').send({ email: ADMIN, password: PASSWORD });
  assert.equal(res.status, 200);
  assert.equal(res.body.tokenType, 'Bearer');
  assert.match(res.body.token, /^[\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(res.body.user.role, 'admin');
  assert.ok(!JSON.stringify(res.body).includes('password'));
});

test('the email is matched ignoring case', async () => {
  const res = await api().post('/api/auth/login').send({ email: 'ADMIN@CleanKigali.rw', password: PASSWORD });
  assert.equal(res.status, 200);
});

test('a wrong password and an unknown email get the same 401', async () => {
  const wrong = await api().post('/api/auth/login').send({ email: ADMIN, password: 'not-the-password' });
  const unknown = await api().post('/api/auth/login').send({ email: 'nobody@cleankigali.rw', password: PASSWORD });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.error.message, unknown.body.error.message);
});

test('a missing email or password is a 400 listing both fields', async () => {
  const res = await api().post('/api/auth/login').send({});
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details.map((d) => d.field), ['email', 'password']);
});

test('GET /api/auth/me returns the logged-in user', async () => {
  const res = await api().get('/api/auth/me').set(await authAs(OFFICER));
  assert.equal(res.status, 200);
  assert.equal(res.body.user.email, OFFICER);
});

test('staff routes need a token, and admin routes need the admin role', async () => {
  assert.equal((await api().get('/api/auth/me')).status, 401);
  assert.equal((await api().get('/api/users').set({ Authorization: 'Bearer nonsense' })).status, 401);
  assert.equal((await api().get('/api/users').set(await authAs(OFFICER))).status, 403);
});

test('a deactivated account cannot log in, and its token stops working', async () => {
  const officer = await authAs(OFFICER);
  await pool.query('UPDATE users SET is_active = false WHERE email = $1', [OFFICER]);
  try {
    const login = await api().post('/api/auth/login').send({ email: OFFICER, password: PASSWORD });
    assert.equal(login.status, 403);
    assert.equal((await api().get('/api/auth/me').set(officer)).status, 401);
  } finally {
    await pool.query('UPDATE users SET is_active = true WHERE email = $1', [OFFICER]);
  }
});
