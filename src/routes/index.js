// Every API route lives under /api. Each resource gets its own router file.
const { Router } = require('express');

const router = Router();

router.use('/health', require('./health.routes'));
<<<<<<< HEAD
=======
router.use('/auth', require('./auth.routes'));
router.use('/reports', require('./reports.routes'));
router.use('/categories', require('./categories.routes'));
router.use('/districts', require('./locations.routes').districts);
router.use('/sectors', require('./locations.routes').sectors);
>>>>>>> 73ef236 (CK001-20: add districts and sectors endpoints)

module.exports = router;
