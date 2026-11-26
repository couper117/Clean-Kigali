const { Router } = require('express');
const { login, me } = require('../controllers/auth.controller');
const { validateLogin } = require('../validators/auth.validator');
const { requireAuth } = require('../middleware/auth');

const router = Router();

router.post('/login', validateLogin, login);
router.get('/me', requireAuth, me);

module.exports = router;
