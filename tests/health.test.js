const { api, pool } = require('./helpers');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

after(() => pool.end());

test('GET /api/health reports the API and database as up', async () => {
  const res = await api().get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database, 'up');
});

test('unknown routes return 404 in the standard error format', async () => {
  const res = await api().get('/api/does-not-exist');
  assert.equal(res.status, 404);
  assert.equal(res.body.error.status, 404);
});

test('a body that is not valid JSON returns 400', async () => {
  const res = await api()
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{bad');
  assert.equal(res.status, 400);
});

test('GET /api-docs.json serves the OpenAPI document', async () => {
  const res = await api().get('/api-docs.json');
  assert.equal(res.status, 200);
  assert.equal(res.body.openapi, '3.0.3');
});
