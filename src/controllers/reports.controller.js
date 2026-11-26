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

module.exports = { create, list };
