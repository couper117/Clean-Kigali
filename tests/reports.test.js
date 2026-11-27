// Reports: create, list, track, update, status history, stats and delete,
// against the seeded test database (15 reports: 5 new, 4 in_progress,
// 4 resolved, 2 rejected).
const { api, pool, resetDatabase, authAs, ADMIN, OFFICER } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

let admin;
let officer;
const report = {
  title: 'Rubbish dumped at the corner',
  description: 'Bags of rubbish left at the corner since Monday',
  categoryId: 1,
  sectorId: 9,
  locationDetails: 'Near the Kimironko market gate',
  latitude: -1.9497,
  longitude: 30.1259,
  reporterName: 'Test Resident',
  reporterPhone: '0788 123 456',
};

before(async () => {
  await resetDatabase();
  admin = await authAs(ADMIN);
  officer = await authAs(OFFICER);
});
after(() => pool.end());

async function createReport(fields = {}) {
  const res = await api().post('/api/reports').send({ ...report, ...fields });
  assert.equal(res.status, 201);
  return res.body;
}

test('anyone can report a problem and gets a reference code', async () => {
  const res = await api().post('/api/reports').send(report);
  assert.equal(res.status, 201);
  assert.match(res.body.reference, /^CK-[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(res.body.status, 'new');
  assert.equal(res.body.priority, 'medium');
  assert.equal(res.body.reporter.phone, '0788123456');
  assert.deepEqual(res.body.sector, { id: 9, name: 'Kimironko', district: 'Gasabo' });
  assert.equal(res.headers.location, `/api/reports/${res.body.id}`);
});

test('an empty report is a 400 naming the required fields', async () => {
  const res = await api().post('/api/reports').send({});
  assert.equal(res.status, 400);
  const fields = res.body.error.details.map((d) => d.field);
  for (const f of ['title', 'description', 'categoryId', 'sectorId']) assert.ok(fields.includes(f), f);
});

test('an unknown category or sector is a 400, not a database error', async () => {
  const res = await api().post('/api/reports').send({ ...report, categoryId: 999, sectorId: 999 });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details.map((d) => d.field), ['categoryId', 'sectorId']);
});

test('staff list reports newest first, filtered and in pages', async () => {
  assert.equal((await api().get('/api/reports')).status, 401);

  const page = await api().get('/api/reports?limit=5&page=2').set(officer);
  assert.equal(page.status, 200);
  assert.equal(page.body.data.length, 5);
  assert.equal(page.body.pagination.page, 2);
  assert.ok(page.body.pagination.total >= 16);

  const resolved = await api().get('/api/reports?status=resolved').set(officer);
  assert.equal(resolved.body.pagination.total, 4);
  assert.ok(resolved.body.data.every((r) => r.status === 'resolved'));

  const dates = resolved.body.data.map((r) => r.createdAt);
  assert.deepEqual(dates, [...dates].sort().reverse());

  assert.equal((await api().get('/api/reports?status=done&limit=500').set(officer)).status, 400);
});

test('residents track a report by reference, without personal details', async () => {
  const created = await createReport();
  const res = await api().get(`/api/reports/track/${created.reference.toLowerCase()}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'new');
  assert.deepEqual(res.body.history, []);
  assert.ok(!JSON.stringify(res.body).includes('0788123456'));
  assert.equal((await api().get('/api/reports/track/CK-ZZZZZZ')).status, 404);
  assert.equal((await api().get('/api/reports/track/nonsense')).status, 400);
});

test('staff get one report, or 404', async () => {
  const created = await createReport();
  const res = await api().get(`/api/reports/${created.id}`).set(officer);
  assert.equal(res.body.reference, created.reference);
  assert.equal((await api().get('/api/reports/99999').set(officer)).status, 404);
});

test('PATCH changes only the fields sent, and refuses the status', async () => {
  const created = await createReport();
  const res = await api().patch(`/api/reports/${created.id}`).set(officer).send({ priority: 'high', assignedTo: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.priority, 'high');
  assert.equal(res.body.assignedTo.id, 2);
  assert.equal(res.body.title, created.title);

  const status = await api().patch(`/api/reports/${created.id}`).set(officer).send({ status: 'resolved' });
  assert.equal(status.status, 400);
  assert.equal(status.body.error.details[0].field, 'status');
});

test('PUT replaces the report and clears optional fields left out', async () => {
  const created = await createReport();
  const res = await api().put(`/api/reports/${created.id}`).set(officer).send({
    title: 'Rubbish at the corner, updated',
    description: 'Bags of rubbish still at the corner',
    categoryId: 2,
    sectorId: 13,
    priority: 'low',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.category.id, 2);
  assert.equal(res.body.locationDetails, null);
  assert.equal(res.body.latitude, null);
});

test('status moves are recorded with who made them; resolved is final', async () => {
  const created = await createReport();
  const move = (body) => api().patch(`/api/reports/${created.id}/status`).set(officer).send(body);

  assert.equal((await move({ status: 'resolved' })).status, 409); // new cannot jump to resolved
  assert.equal((await move({ status: 'in_progress', note: 'On the way' })).status, 200);
  const resolved = await move({ status: 'resolved', note: 'Cleaned' });
  assert.equal(resolved.status, 200);
  assert.ok(resolved.body.resolvedAt);

  const back = await move({ status: 'new' });
  assert.equal(back.status, 409);
  assert.match(back.body.error.message, /resolved is final/);

  const history = await api().get(`/api/reports/${created.id}/updates`).set(officer);
  assert.deepEqual(history.body.map((h) => [h.oldStatus, h.newStatus]), [['new', 'in_progress'], ['in_progress', 'resolved']]);
  assert.equal(history.body[0].changedBy.id, 2);

  const tracked = await api().get(`/api/reports/track/${created.reference}`);
  assert.equal(tracked.body.history.length, 2);
});

test('rejecting needs a note; unknown statuses are a 400', async () => {
  const created = await createReport();
  const move = (body) => api().patch(`/api/reports/${created.id}/status`).set(officer).send(body);
  assert.equal((await move({ status: 'rejected' })).status, 400);
  assert.equal((await move({ status: 'finished' })).status, 400);
  assert.equal((await move({ status: 'rejected', note: 'Duplicate report' })).status, 200);
  assert.equal((await api().patch('/api/reports/99999/status').set(officer).send({ status: 'in_progress' })).status, 404);
});

test('stats count every status and the average time to resolve', async () => {
  const res = await api().get('/api/reports/stats').set(officer);
  assert.equal(res.status, 200);
  const { byStatus } = res.body;
  assert.equal(res.body.total, byStatus.new + byStatus.in_progress + byStatus.resolved + byStatus.rejected);
  assert.ok(byStatus.resolved >= 4);
  assert.equal(res.body.byCategory.length, 6);
  assert.equal(typeof res.body.averageHoursToResolve, 'number');
  assert.equal((await api().get('/api/reports/stats')).status, 401);
});

test('only admins delete reports, and the history goes with them', async () => {
  const created = await createReport();
  await api().patch(`/api/reports/${created.id}/status`).set(officer).send({ status: 'in_progress' });

  assert.equal((await api().delete(`/api/reports/${created.id}`).set(officer)).status, 403);
  assert.equal((await api().delete(`/api/reports/${created.id}`).set(admin)).status, 204);
  assert.equal((await api().get(`/api/reports/${created.id}`).set(admin)).status, 404);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM report_updates WHERE report_id = $1', [created.id]);
  assert.equal(rows[0].n, 0);
  assert.equal((await api().delete(`/api/reports/${created.id}`).set(admin)).status, 404);
});
