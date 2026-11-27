// Every API route lives under /api. Each resource gets its own router file.
const { Router } = require('express');

const router = Router();

router.use('/health', require('./health.routes'));

module.exports = router;
