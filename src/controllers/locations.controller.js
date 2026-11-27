const locations = require('../services/locations.service');

// GET /api/districts
async function districts(req, res) {
  res.json(await locations.listDistricts());
}

// GET /api/districts/:id/sectors
async function sectorsOfDistrict(req, res) {
  res.json(await locations.sectorsOfDistrict(req.valid.params.id));
}

// GET /api/sectors?districtId=
async function sectors(req, res) {
  res.json(await locations.listSectors(req.valid.query));
}

module.exports = { districts, sectorsOfDistrict, sectors };
