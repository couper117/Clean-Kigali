// Every API route lives under /api. Each resource gets its own router file.
const { Router } = require('express');

const router = Router();

router.use('/health', require('./health.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/users', require('./users.routes'));
router.use('/districts', require('./locations.routes').districts);
router.use('/sectors', require('./locations.routes').sectors);

module.exports = router;
