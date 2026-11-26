const authService = require('../services/auth.service');

// POST /api/auth/login: email and password in, token and user out.
async function login(req, res) {
  const result = await authService.login(req.body.email, req.body.password);
  res.json(result);
}

// GET /api/auth/me: the logged-in user, as loaded by requireAuth.
function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
