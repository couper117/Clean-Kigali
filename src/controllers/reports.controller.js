const reportsService = require('../services/reports.service');
const reportStatus = require('../services/reportStatus.service');
const reportStats = require('../services/reportStats.service');

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

// PATCH /api/reports/:id/status: records who changed it and why.
async function changeStatus(req, res) {
  res.json(await reportStatus.changeStatus(req.reportId, req.body, req.user));
}

// GET /api/reports/:id/updates: the status history (staff).
async function history(req, res) {
  res.json(await reportStatus.history(req.reportId));
}

// GET /api/reports/stats: counts and average time to resolve (staff).
async function stats(req, res) {
  res.json(await reportStats.stats());
}

module.exports = {
  create, list, track, getOne, update, remove, changeStatus, history, stats,
};
