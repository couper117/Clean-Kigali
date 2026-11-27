const users = require('../services/users.service');

// GET /api/users?role=&isActive=
async function list(req, res) {
  res.json(await users.list(req.valid.query));
}

// GET /api/users/:id
async function getOne(req, res) {
  res.json(await users.getById(req.valid.params.id));
}

// POST /api/users
async function create(req, res) {
  const user = await users.create(req.body);
  res.status(201).location(`/api/users/${user.id}`).json(user);
}

// PUT /api/users/:id
async function replace(req, res) {
  res.json(await users.replace(req.user, req.valid.params.id, req.body));
}

// DELETE /api/users/:id: deactivates the account.
async function remove(req, res) {
  await users.deactivate(req.user, req.valid.params.id);
  res.status(204).end();
}

module.exports = { list, getOne, create, replace, remove };
