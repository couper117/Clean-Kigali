// Users CRUD (admins only) against the test database.
const { api, pool, resetDatabase, authAs, PASSWORD, ADMIN, OFFICER } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let admin;
const newOfficer = {
  fullName: 'Claudine Mukamana',
  email: 'Officer.Remera@CleanKigali.rw',
  password: 'remera-password',
  role: 'officer',
  sectorId: 13,
};

before(async () => {
  await resetDatabase();
  admin = await authAs(ADMIN);
});
after(() => pool.end());

test('admins list staff without any password hash', async () => {
  const res = await api().get('/api/users').set(admin);
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 3);
  assert.ok(!JSON.stringify(res.body).toLowerCase().includes('hash'));
});

test('the list can be filtered by role and active flag', async () => {
  const officers = await api().get('/api/users?role=officer&isActive=true').set(admin);
  assert.equal(officers.body.length, 2);
  assert.equal((await api().get('/api/users?role=boss').set(admin)).status, 400);
});

test('officers cannot see or manage staff', async () => {
  const officer = await authAs(OFFICER);
  assert.equal((await api().get('/api/users').set(officer)).status, 403);
  assert.equal((await api().post('/api/users').set(officer).send(newOfficer)).status, 403);
});

test('an admin creates an account that can then log in', async () => {
  const res = await api().post('/api/users').set(admin).send(newOfficer);
  assert.equal(res.status, 201);
  assert.equal(res.body.email, 'officer.remera@cleankigali.rw');
  assert.equal(res.headers.location, `/api/users/${res.body.id}`);
  const login = await api().post('/api/auth/login')
    .send({ email: 'officer.remera@cleankigali.rw', password: newOfficer.password });
  assert.equal(login.status, 200);
});

test('an email already used, in any case, is a 409', async () => {
  const res = await api().post('/api/users').set(admin).send({ ...newOfficer, email: 'OFFICER.REMERA@cleankigali.rw' });
  assert.equal(res.status, 409);
});

test('invalid fields and unknown sectors are a 400', async () => {
  const bad = await api().post('/api/users').set(admin).send({ email: 'nope', password: 'short', role: 'boss' });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body.error.details.map((d) => d.field), ['fullName', 'email', 'role', 'password']);
  const sector = await api().post('/api/users').set(admin)
    .send({ ...newOfficer, email: 'another@cleankigali.rw', sectorId: 999 });
  assert.equal(sector.status, 400);
  assert.equal(sector.body.error.details[0].field, 'sectorId');
});

test('one account, or 404', async () => {
  assert.equal((await api().get('/api/users/2').set(admin)).body.email, OFFICER);
  assert.equal((await api().get('/api/users/999').set(admin)).status, 404);
});

test('PUT keeps the password when none is sent and clears a sector left out', async () => {
  const res = await api().put('/api/users/2').set(admin)
    .send({ fullName: 'Aline Uwase Mutoni', email: OFFICER, role: 'officer' });
  assert.equal(res.status, 200);
  assert.equal(res.body.fullName, 'Aline Uwase Mutoni');
  assert.equal(res.body.sectorId, null);
  const login = await api().post('/api/auth/login').send({ email: OFFICER, password: PASSWORD });
  assert.equal(login.status, 200);
});

test('an admin cannot demote or deactivate themselves', async () => {
  const demote = await api().put('/api/users/1').set(admin)
    .send({ fullName: 'Jean Bosco Niyonzima', email: ADMIN, role: 'officer' });
  assert.equal(demote.status, 409);
  assert.equal((await api().delete('/api/users/1').set(admin)).status, 409);
});

test('DELETE deactivates: the account stays but cannot log in', async () => {
  const officer = await authAs(OFFICER);
  assert.equal((await api().delete('/api/users/2').set(admin)).status, 204);
  assert.equal((await api().get('/api/users/2').set(admin)).body.isActive, false);
  assert.equal((await api().get('/api/auth/me').set(officer)).status, 401);
  assert.equal((await api().delete('/api/users/999').set(admin)).status, 404);

  // PUT with isActive true brings it back.
  const back = await api().put('/api/users/2').set(admin)
    .send({ fullName: 'Aline Uwase', email: OFFICER, role: 'officer', isActive: true });
  assert.equal(back.body.isActive, true);
});
