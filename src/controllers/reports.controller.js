const reportsService = require('../services/reports.service');

// POST /api/reports: anyone can report a problem and gets a reference code back.
async function create(req, res) {
  const report = await reportsService.create(req.body);
  res.status(201).location(`/api/reports/${report.id}`).json(report);
}

// GET /api/reports: staff list with filters and pages.
async function list(req, res) {
  res.json(await reportsService.list(req.filters));
}

// GET /api/reports/track/:reference: residents follow their report.
async function track(req, res) {
  res.json(await reportsService.track(req.reference));
}

// GET /api/reports/:id: one report with every detail (staff).
async function getOne(req, res) {
  res.json(await reportsService.getById(req.reportId));
}

// PUT and PATCH /api/reports/:id: the validator decides which fields are in req.body.
async function update(req, res) {
  res.json(await reportsService.update(req.reportId, req.body));
}

// DELETE /api/reports/:id (admin).
async function remove(req, res) {
  await reportsService.remove(req.reportId);
  res.status(204).end();
}

module.exports = { create, list, track, getOne, update, remove };
