// Public: residents need the districts and sectors to fill in a report.
const { Router } = require('express');
const controller = require('../controllers/locations.controller');
const { validate, rules, idParam } = require('../middleware/validate');

const districts = Router();
districts.get('/', controller.districts);
districts.get('/:id/sectors', idParam, controller.sectorsOfDistrict);

const sectors = Router();
sectors.get('/', validate({ query: { districtId: rules.id() } }), controller.sectors);

module.exports = { districts, sectors };
