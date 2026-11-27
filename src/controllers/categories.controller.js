const categories = require('../services/categories.service');

// GET /api/categories (public)
async function list(req, res) {
  res.json(await categories.list());
}

// GET /api/categories/:id (public)
async function getOne(req, res) {
  res.json(await categories.getById(req.valid.params.id));
}

// POST /api/categories (admin)
async function create(req, res) {
  const category = await categories.create(req.body);
  res.status(201).location(`/api/categories/${category.id}`).json(category);
}

// PUT /api/categories/:id (admin)
async function replace(req, res) {
  res.json(await categories.replace(req.valid.params.id, req.body));
}

// DELETE /api/categories/:id (admin)
async function remove(req, res) {
  await categories.remove(req.valid.params.id);
  res.status(204).end();
}

module.exports = { list, getOne, create, replace, remove };
