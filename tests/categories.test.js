// Categories CRUD against the test database.
const { api, pool, resetDatabase, authAs, ADMIN, OFFICER } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let admin;
before(async () => {
  await resetDatabase();
  admin = await authAs(ADMIN);
});
after(() => pool.end());

test('anyone can list categories, by name', async () => {
  const res = await api().get('/api/categories');
  assert.equal(res.status, 200);
  assert.equal(res.body.length, 6);
  const names = res.body.map((c) => c.name);
  assert.deepEqual(names, [...names].sort());
});

test('one category, or 404 / 400 for a bad id', async () => {
  assert.equal((await api().get('/api/categories/1')).body.name, 'Illegal dumping');
  assert.equal((await api().get('/api/categories/999')).status, 404);
  assert.equal((await api().get('/api/categories/abc')).status, 400);
});

test('an admin creates a category: 201 with a Location header', async () => {
  const res = await api().post('/api/categories').set(admin)
    .send({ name: '  Street litter ', description: 'Litter along the street' });
  assert.equal(res.status, 201);
  assert.equal(res.body.name, 'Street litter');
  assert.equal(res.headers.location, `/api/categories/${res.body.id}`);
});

test('a name that exists already, in any case, is a 409', async () => {
  const res = await api().post('/api/categories').set(admin).send({ name: 'BLOCKED DRAIN' });
  assert.equal(res.status, 409);
});

test('invalid fields are a 400, one entry each', async () => {
  const res = await api().post('/api/categories').set(admin).send({ name: 'x', description: 7 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details.map((d) => d.field), ['name', 'description']);
});

test('officers and visitors cannot change categories', async () => {
  assert.equal((await api().post('/api/categories').send({ name: 'Anything' })).status, 401);
  const officer = await authAs(OFFICER);
  assert.equal((await api().post('/api/categories').set(officer).send({ name: 'Anything' })).status, 403);
  assert.equal((await api().delete('/api/categories/6').set(officer)).status, 403);
});

test('PUT replaces the category and clears a description left out', async () => {
  const res = await api().put('/api/categories/6').set(admin).send({ name: 'Public toilet problem' });
  assert.equal(res.status, 200);
  assert.equal(res.body.name, 'Public toilet problem');
  assert.equal(res.body.description, null);
  assert.equal((await api().put('/api/categories/999').set(admin).send({ name: 'Nothing here' })).status, 404);
});

test('a category used by reports cannot be deleted; an unused one can', async () => {
  const used = await api().delete('/api/categories/1').set(admin);
  assert.equal(used.status, 409);
  assert.match(used.body.error.message, /used by 4 report/);

  const created = await api().post('/api/categories').set(admin).send({ name: 'To be deleted' });
  assert.equal((await api().delete(`/api/categories/${created.body.id}`).set(admin)).status, 204);
  assert.equal((await api().get(`/api/categories/${created.body.id}`)).status, 404);
});
