const { Router } = require('express');
const controller = require('../controllers/reports.controller');
const {
  validateCreateReport, validateListQuery, validateReportId, validateReference,
  validateReportReplace, validateReportPatch, validateStatusChange,
} = require('../validators/reports.validator');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();

// Public
router.post('/', validateCreateReport, controller.create);
router.get('/track/:reference', validateReference, controller.track);

// Staff
router.get('/', requireAuth, validateListQuery, controller.list);

// Paths with a fixed word (such as /stats) must be added ABOVE this line,
// otherwise '/:id' catches them first and answers 400.
router.get('/:id', requireAuth, validateReportId, controller.getOne);
router.put('/:id', requireAuth, validateReportId, validateReportReplace, controller.update);
router.patch('/:id', requireAuth, validateReportId, validateReportPatch, controller.update);
router.delete('/:id', requireAuth, requireRole('admin'), validateReportId, controller.remove);

router.patch('/:id/status', requireAuth, validateReportId, validateStatusChange, controller.changeStatus);
router.get('/:id/updates', requireAuth, validateReportId, controller.history);

module.exports = router;
