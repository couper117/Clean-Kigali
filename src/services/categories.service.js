// Categories: the problem types residents choose from.
const db = require('../db/pool');
const AppError = require('../utils/AppError');

const COLUMNS = 'id, name, description, created_at, updated_at';

function toCategory(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Names are unique ignoring case (index categories_name_key on lower(name)).
function duplicateName(err, name) {
  if (err.code === '23505' && err.constraint === 'categories_name_key') {
    return new AppError(409, `A category named "${name}" already exists`);
  }
  return err;
}

async function list() {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM categories ORDER BY name`);
  return rows.map(toCategory);
}

async function getById(id) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM categories WHERE id = $1`, [id]);
  if (!rows.length) throw new AppError(404, 'Category not found');
  return toCategory(rows[0]);
}

async function create({ name, description = null }) {
  try {
    const { rows } = await db.query(
      `INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
      [name, description],
    );
    return toCategory(rows[0]);
  } catch (err) {
    throw duplicateName(err, name);
  }
}

async function replace(id, { name, description }) {
  try {
    const { rows } = await db.query(
      `UPDATE categories SET name = $1, description = $2, updated_at = now()
        WHERE id = $3 RETURNING ${COLUMNS}`,
      [name, description, id],
    );
    if (!rows.length) throw new AppError(404, 'Category not found');
    return toCategory(rows[0]);
  } catch (err) {
    throw duplicateName(err, name);
  }
}

// A category that reports still use cannot go: those reports would lose their type.
async function remove(id) {
  await getById(id);
  const { rows: [used] } = await db.query(
    'SELECT count(*)::int AS reports FROM reports WHERE category_id = $1',
    [id],
  );
  if (used.reports > 0) {
    throw new AppError(409, `This category is used by ${used.reports} report(s); move them to another category first`);
  }
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
}

module.exports = { list, getById, create, replace, remove };
