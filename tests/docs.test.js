const { api, pool } = require('./helpers');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');

after(() => pool.end());

test('GET /api-docs serves the Swagger UI page with its scripts from the CDN', async () => {
  const res = await api().get('/api-docs');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.text, /cdn\.jsdelivr\.net\/npm\/swagger-ui-dist@\d+\.\d+\.\d+\/swagger-ui-bundle\.js/);
  // The page may load the CDN; the rest of the API keeps the strict default policy.
  assert.match(res.headers['content-security-policy'], /script-src 'self' https:\/\/cdn\.jsdelivr\.net/);
});

test('GET /api-docs/init.js points Swagger UI at the OpenAPI document', async () => {
  const res = await api().get('/api-docs/init.js');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /javascript/);
  assert.match(res.text, /url: '\/api-docs\.json'/);
});

test('other routes keep the strict content security policy', async () => {
  const res = await api().get('/api/health');
  assert.doesNotMatch(res.headers['content-security-policy'], /jsdelivr/);
});
