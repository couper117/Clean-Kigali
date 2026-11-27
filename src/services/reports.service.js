// Reports: SQL and business rules. Every value goes in as a parameter ($1, $2, ...).
const { randomInt } = require('node:crypto');

const db = require('../db/pool');
const AppError = require('../utils/AppError');

// Reference codes like CK-7F3K2A. No 0/O or 1/I, so they are easy to read out by phone.
const REFERENCE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeReference() {
  let code = '';
  for (let i = 0; i < 6; i += 1) code += REFERENCE_CHARS[randomInt(REFERENCE_CHARS.length)];
  return `CK-${code}`;
}

// One report with the names of its category, sector, district and assigned officer.
const REPORT_SELECT = `
  SELECT r.id, r.reference, r.title, r.description,
         r.category_id, c.name AS category_name,
         r.sector_id, s.name AS sector_name, d.name AS district_name,
         r.location_details, r.latitude, r.longitude,
         r.status, r.priority, r.reporter_name, r.reporter_phone,
         r.assigned_to, u.full_name AS assigned_to_name,
         r.created_at, r.updated_at, r.resolved_at
    FROM reports r
    JOIN categories c ON c.id = r.category_id
    JOIN sectors s ON s.id = r.sector_id
    JOIN districts d ON d.id = s.district_id
    LEFT JOIN users u ON u.id = r.assigned_to`;

// PostgreSQL numeric comes back as text; send coordinates as numbers.
const toNumber = (value) => (value === null ? null : Number(value));

// Database row (snake_case) -> API object (camelCase).
function toReport(row) {
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    description: row.description,
    category: { id: row.category_id, name: row.category_name },
    sector: { id: row.sector_id, name: row.sector_name, district: row.district_name },
    locationDetails: row.location_details,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    status: row.status,
    priority: row.priority,
    reporter: { name: row.reporter_name, phone: row.reporter_phone },
    assignedTo: row.assigned_to ? { id: row.assigned_to, fullName: row.assigned_to_name } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

async function findById(id) {
  const { rows } = await db.query(`${REPORT_SELECT} WHERE r.id = $1`, [id]);
  return rows[0] ? toReport(rows[0]) : null;
}

// Answers 400 naming each linked record that does not exist, instead of a bare
// foreign-key error from the database.
async function checkLinks({ categoryId, sectorId }) {
  const { rows: [found] } = await db.query(
    `SELECT ($1::int IS NULL OR EXISTS (SELECT 1 FROM categories WHERE id = $1)) AS category,
            ($2::int IS NULL OR EXISTS (SELECT 1 FROM sectors WHERE id = $2)) AS sector`,
    [categoryId ?? null, sectorId ?? null],
  );
  const details = [];
  if (!found.category) details.push({ field: 'categoryId', message: `There is no category with id ${categoryId}` });
  if (!found.sector) details.push({ field: 'sectorId', message: `There is no sector with id ${sectorId}` });
  if (details.length) throw new AppError(400, 'Some fields are not valid', details);
}

async function create(input) {
  await checkLinks(input);

  // A clash between two random codes is very unlikely (32^6 = about a billion codes);
  // if it happens, the unique constraint refuses the row and we try a new code.
  for (let attempt = 1; ; attempt += 1) {
    try {
      const { rows } = await db.query(
        `INSERT INTO reports (reference, title, description, category_id, sector_id,
                              location_details, latitude, longitude, reporter_name, reporter_phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [makeReference(), input.title, input.description, input.categoryId, input.sectorId,
          input.locationDetails, input.latitude, input.longitude, input.reporterName, input.reporterPhone],
      );
      return findById(rows[0].id);
    } catch (err) {
      const referenceTaken = err.code === '23505' && /reference/.test(err.constraint || '');
      if (!referenceTaken || attempt === 5) throw err;
    }
  }
}

// Filters, newest first, one page at a time.
async function list(filters) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.status) add('r.status = ?', filters.status);
  if (filters.priority) add('r.priority = ?', filters.priority);
  if (filters.categoryId) add('r.category_id = ?', filters.categoryId);
  if (filters.sectorId) add('r.sector_id = ?', filters.sectorId);
  if (filters.assignedTo) add('r.assigned_to = ?', filters.assignedTo);
  // Dates are whole days in Kigali time: "to" includes everything reported that day.
  if (filters.from) add("r.created_at >= (?::date)::timestamp AT TIME ZONE 'Africa/Kigali'", filters.from);
  if (filters.to) add("r.created_at < (?::date + 1)::timestamp AT TIME ZONE 'Africa/Kigali'", filters.to);

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { page, limit } = filters;

  const [{ rows }, { rows: [count] }] = await Promise.all([
    db.query(
      `${REPORT_SELECT} ${whereSql} ORDER BY r.created_at DESC, r.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (page - 1) * limit],
    ),
    db.query(`SELECT count(*)::int AS total FROM reports r ${whereSql}`, params),
  ]);

  return {
    data: rows.map(toReport),
    pagination: { page, limit, total: count.total, totalPages: Math.ceil(count.total / limit) },
  };
}

async function getById(id) {
  const report = await findById(id);
  if (!report) throw new AppError(404, 'Report not found');
  return report;
}

// What a resident sees when following their report: progress only, no contact
// details or staff names.
async function track(reference) {
  const { rows: [row] } = await db.query(
    `SELECT r.id, r.reference, r.title, c.name AS category, s.name AS sector, d.name AS district,
            r.status, r.created_at, r.updated_at, r.resolved_at
       FROM reports r
       JOIN categories c ON c.id = r.category_id
       JOIN sectors s ON s.id = r.sector_id
       JOIN districts d ON d.id = s.district_id
      WHERE r.reference = $1`,
    [reference],
  );
  if (!row) throw new AppError(404, `No report has the reference ${reference}`);

  const { rows: history } = await db.query(
    `SELECT old_status, new_status, note, created_at
       FROM report_updates WHERE report_id = $1 ORDER BY created_at, id`,
    [row.id],
  );

  return {
    reference: row.reference,
    title: row.title,
    category: row.category,
    sector: row.sector,
    district: row.district,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    history: history.map((h) => ({
      oldStatus: h.old_status, newStatus: h.new_status, note: h.note, createdAt: h.created_at,
    })),
  };
}

// API field -> column. Only these can be changed by update().
const COLUMNS = {
  title: 'title',
  description: 'description',
  categoryId: 'category_id',
  sectorId: 'sector_id',
  priority: 'priority',
  locationDetails: 'location_details',
  latitude: 'latitude',
  longitude: 'longitude',
  reporterName: 'reporter_name',
  reporterPhone: 'reporter_phone',
  assignedTo: 'assigned_to',
};

async function checkAssignee(userId) {
  const { rows } = await db.query('SELECT 1 FROM users WHERE id = $1 AND is_active', [userId]);
  if (!rows.length) {
    throw new AppError(400, 'Some fields are not valid', [
      { field: 'assignedTo', message: `There is no active staff member with id ${userId}` },
    ]);
  }
}

// Changes the given fields (PUT sends all of them, PATCH some).
async function update(id, changes) {
  await getById(id);
  await checkLinks(changes);
  if (changes.assignedTo) await checkAssignee(changes.assignedTo);

  const fields = Object.keys(changes).filter((field) => COLUMNS[field]);
  const sets = fields.map((field, i) => `${COLUMNS[field]} = $${i + 1}`);
  const { rowCount } = await db.query(
    `UPDATE reports SET ${sets.join(', ')}, updated_at = now() WHERE id = $${fields.length + 1}`,
    [...fields.map((field) => changes[field]), id],
  );
  // Someone may have deleted it between the check above and this update.
  if (rowCount === 0) throw new AppError(404, 'Report not found');
  return getById(id);
}

// Its status history goes with it (ON DELETE CASCADE on report_updates).
async function remove(id) {
  const { rowCount } = await db.query('DELETE FROM reports WHERE id = $1', [id]);
  if (rowCount === 0) throw new AppError(404, 'Report not found');
}

module.exports = {
  create, list, findById, getById, track, update, remove,
  checkLinks, toReport, makeReference, REPORT_SELECT,
};
