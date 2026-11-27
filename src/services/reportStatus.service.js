// Report status changes. Each change is recorded in report_updates with who made
// it and why, in the same transaction, so the history always matches the report.
const db = require('../db/pool');
const AppError = require('../utils/AppError');
const { getById } = require('./reports.service');

// Where a report can go from each status. Resolved and rejected are final.
const NEXT = {
  new: ['in_progress', 'rejected'],
  in_progress: ['resolved', 'rejected'],
  resolved: [],
  rejected: [],
};

function checkMove(from, to) {
  if (from === to) throw new AppError(409, `The report is already ${from}`);
  if (!NEXT[from].includes(to)) {
    const allowed = NEXT[from].length ? `it can move to ${NEXT[from].join(' or ')}` : `${from} is final`;
    throw new AppError(409, `A report that is ${from} cannot move to ${to}: ${allowed}`);
  }
}

async function changeStatus(reportId, { status, note = null }, user) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE: two staff changing the same report at once are handled one by one.
    const { rows: [report] } = await client.query(
      'SELECT status FROM reports WHERE id = $1 FOR UPDATE',
      [reportId],
    );
    if (!report) throw new AppError(404, 'Report not found');
    checkMove(report.status, status);

    await client.query(
      `UPDATE reports
          SET status = $1::varchar, updated_at = now(),
              resolved_at = CASE WHEN $1::varchar = 'resolved' THEN now() ELSE resolved_at END
        WHERE id = $2`,
      [status, reportId],
    );
    await client.query(
      `INSERT INTO report_updates (report_id, user_id, old_status, new_status, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [reportId, user.id, report.status, status, note],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return getById(reportId);
}

// The full history for staff, oldest first, with who made each change.
async function history(reportId) {
  await getById(reportId);
  const { rows } = await db.query(
    `SELECT ru.id, ru.old_status, ru.new_status, ru.note, ru.created_at,
            u.id AS user_id, u.full_name AS user_name
       FROM report_updates ru
       LEFT JOIN users u ON u.id = ru.user_id
      WHERE ru.report_id = $1
      ORDER BY ru.created_at, ru.id`,
    [reportId],
  );
  return rows.map((r) => ({
    id: r.id,
    oldStatus: r.old_status,
    newStatus: r.new_status,
    note: r.note,
    changedBy: r.user_id ? { id: r.user_id, fullName: r.user_name } : null,
    createdAt: r.created_at,
  }));
}

module.exports = { changeStatus, history, checkMove, NEXT };
