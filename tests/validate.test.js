// The shared validate() middleware. No database needed.
require('./helpers');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validate, rules } = require('../src/middleware/validate');

// Runs the middleware on a fake request; returns the error or the request.
function run(middleware, req) {
  const full = { params: {}, query: {}, body: {}, ...req };
  let result;
  middleware(full, {}, (err) => { result = err || full; });
  return result;
}

const category = {
  name: rules.text({ required: true, min: 2, max: 60 }),
  description: rules.text({ max: 500 }),
};

test('accepts and cleans valid fields, dropping unknown ones', () => {
  const req = run(validate({ body: category }), { body: { name: '  Blocked drain ', extra: 1 } });
  assert.deepEqual(req.body, { name: 'Blocked drain' });
  assert.deepEqual(req.valid.body, { name: 'Blocked drain' });
});

test('lists every invalid field in one 400', () => {
  const err = run(validate({ body: { ...category, sectorId: rules.id() } }), {
    body: { description: 5, sectorId: 0 },
  });
  assert.equal(err.statusCode, 400);
  assert.deepEqual(err.details.map((d) => d.field), ['name', 'description', 'sectorId']);
});

test('replace mode clears optional fields that were left out', () => {
  const req = run(validate({ body: category }, { mode: 'replace' }), { body: { name: 'Burning waste' } });
  assert.deepEqual(req.body, { name: 'Burning waste', description: null });
});

test('patch mode needs at least one field but no required ones', () => {
  const ok = run(validate({ body: category }, { mode: 'patch' }), { body: { description: 'New text' } });
  assert.deepEqual(ok.body, { description: 'New text' });
  const err = run(validate({ body: category }, { mode: 'patch' }), { body: {} });
  assert.equal(err.details[0].field, 'body');
});

test('null clears optional fields and is refused for required ones', () => {
  const req = run(validate({ body: { sectorId: rules.id() } }), { body: { sectorId: null } });
  assert.deepEqual(req.body, { sectorId: null });
  const err = run(validate({ body: category }), { body: { name: null } });
  assert.equal(err.details[0].message, 'name is required');
});

test('params and query strings: ids, booleans, repeated values', () => {
  const v = validate({ params: { id: rules.id({ required: true }) }, query: { isActive: rules.boolean() } });
  const req = run(v, { params: { id: '7' }, query: { isActive: 'false' } });
  assert.deepEqual(req.valid, { params: { id: 7 }, query: { isActive: false } });
  const err = run(v, { params: { id: 'abc' }, query: { isActive: ['true', 'false'] } });
  assert.deepEqual(err.details.map((d) => d.message), [
    'id must be a whole number of 1 or more', 'Send isActive only once',
  ]);
});

test('emails are lower-cased and passwords keep their spaces', () => {
  const v = validate({ body: { email: rules.email({ required: true }), password: rules.password({ required: true }) } });
  const req = run(v, { body: { email: ' Officer@CleanKigali.RW ', password: ' long pass ' } });
  assert.deepEqual(req.body, { email: 'officer@cleankigali.rw', password: ' long pass ' });
  const err = run(v, { body: { email: 'nope', password: 'short' } });
  assert.equal(err.details.length, 2);
});

test('a second validate() on the same route adds to req.valid', () => {
  const first = validate({ params: { id: rules.id({ required: true }) } });
  const second = validate({ body: category });
  const req = run(first, { params: { id: '3' }, body: { name: 'Blocked drain' } });
  second(req, {}, (err) => assert.equal(err, undefined));
  assert.deepEqual(req.valid, { params: { id: 3 }, query: {}, body: { name: 'Blocked drain' } });
});
