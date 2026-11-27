// Checks report input rules that run before any database query, so these tests work
// before the reports table exists. Full report tests against the database are in reports.test.js.
const { api, pool } = require('./helpers');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { validateCreateReport, validateListQuery } = require('../src/validators/reports.validator');
const { makeReference } = require('../src/services/reports.service');

after(() => pool.end());

// Runs a validator on a fake request; returns the error it passed on, or the request.
function run(validator, req) {
  let error;
  validator(req, {}, (err) => { error = err; });
  return error || req;
}

test('reference codes look like CK-7F3K2A and never use 0, O, 1 or I', () => {
  for (let i = 0; i < 500; i += 1) assert.match(makeReference(), /^CK-[A-HJ-NP-Z2-9]{6}$/);
});

test('POST /api/reports with an empty body returns 400 listing each required field', async () => {
  const res = await api().post('/api/reports').send({});
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details.map((d) => d.field), ['title', 'description', 'categoryId', 'sectorId']);
});

test('a valid report body is trimmed and cleaned; staff-only fields are dropped', () => {
  const req = run(validateCreateReport, { body: {
    title: '  Full bin  ', description: 'Bin by the bus stop is full', categoryId: 2, sectorId: 5,
    reporterPhone: '+250 788 123 456', status: 'resolved', assignedTo: 1,
  } });
  assert.equal(req.body.title, 'Full bin');
  assert.equal(req.body.reporterPhone, '+250788123456');
  assert.equal(req.body.status, undefined);
  assert.equal(req.body.assignedTo, undefined);
});

test('bad coordinates and phone numbers are refused', () => {
  const base = { title: 'Full bin', description: 'Bin by the bus stop is full', categoryId: 2, sectorId: 5 };
  const fields = (body) => run(validateCreateReport, { body: { ...base, ...body } }).details.map((d) => d.field);
  assert.deepEqual(fields({ latitude: 91, longitude: 30 }), ['latitude']);
  assert.deepEqual(fields({ latitude: -1.95 }), ['latitude']);
  assert.deepEqual(fields({ reporterPhone: '0712' }), ['reporterPhone']);
});

test('GET /api/reports needs a staff token', async () => {
  const res = await api().get('/api/reports');
  assert.equal(res.status, 401);
});

test('list filters: defaults, limits and wrong values', () => {
  assert.deepEqual(run(validateListQuery, { query: {} }).filters, {
    status: null, priority: null, categoryId: null, sectorId: null, assignedTo: null,
    from: null, to: null, page: 1, limit: 20,
  });
  const fields = (query) => run(validateListQuery, { query }).details.map((d) => d.field);
  assert.deepEqual(fields({ limit: '101' }), ['limit']);
  assert.deepEqual(fields({ status: 'open', page: '0' }), ['status', 'page']);
  assert.deepEqual(fields({ from: '2026-02-30' }), ['from']);
  assert.deepEqual(fields({ from: '2026-11-29', to: '2026-11-01' }), ['to']);
  assert.deepEqual(fields({ sectorId: ['1', '2'] }), ['sectorId']);
});
