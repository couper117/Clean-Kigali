const { Router } = require('express');
const controller = require('../controllers/reports.controller');
const { validateCreateReport, validateListQuery } = require('../validators/reports.validator');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/', validateCreateReport, controller.create);
router.get('/', requireAuth, validateListQuery, controller.list);

module.exports = router;
