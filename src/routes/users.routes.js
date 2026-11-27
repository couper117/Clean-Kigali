// Staff accounts. Admins only.
const { Router } = require('express');
const controller = require('../controllers/users.controller');
const { idParam } = require('../middleware/validate');
const { validateUserList, validateUserCreate, validateUserReplace } = require('../validators/users.validator');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', validateUserList, controller.list);
router.get('/:id', idParam, controller.getOne);
router.post('/', validateUserCreate, controller.create);
router.put('/:id', validateUserReplace, controller.replace);
router.delete('/:id', idParam, controller.remove);

module.exports = router;
