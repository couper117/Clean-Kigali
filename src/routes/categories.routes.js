const { Router } = require('express');
const controller = require('../controllers/categories.controller');
const { idParam } = require('../middleware/validate');
const { validateCategoryCreate, validateCategoryReplace } = require('../validators/categories.validator');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();
const admin = [requireAuth, requireRole('admin')];

// Public: residents pick a category when reporting.
router.get('/', controller.list);
router.get('/:id', idParam, controller.getOne);

// Admin only.
router.post('/', ...admin, validateCategoryCreate, controller.create);
router.put('/:id', ...admin, validateCategoryReplace, controller.replace);
router.delete('/:id', ...admin, idParam, controller.remove);

module.exports = router;
