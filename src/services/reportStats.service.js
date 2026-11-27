// Numbers for the dashboard and the evaluation slide.
const db = require('../db/pool');
const { STATUSES } = require('../validators/reports.validator');

async function stats() {
  const [byStatus, byCategory, bySector, resolution] = await Promise.all([
    db.query('SELECT status, count(*)::int AS count FROM reports GROUP BY status'),
    // Every category, including those with no reports yet.
    db.query(
      `SELECT c.id, c.name, count(r.id)::int AS count
         FROM categories c LEFT JOIN reports r ON r.category_id = c.id
        GROUP BY c.id ORDER BY count DESC, c.name`,
    ),
    // Only sectors that have reports: there are 35, most of them quiet.
    db.query(
      `SELECT s.id, s.name, d.name AS district, count(*)::int AS count
         FROM reports r JOIN sectors s ON s.id = r.sector_id JOIN districts d ON d.id = s.district_id
        GROUP BY s.id, d.name ORDER BY count DESC, s.name`,
    ),
    db.query(
      `SELECT count(*)::int AS resolved,
              round(avg(extract(epoch FROM resolved_at - created_at) / 3600)::numeric, 1) AS hours
         FROM reports WHERE status = 'resolved' AND resolved_at IS NOT NULL`,
    ),
  ]);

  // Every status appears, with 0 when no report has it.
  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const row of byStatus.rows) statusCounts[row.status] = row.count;
  const [res] = resolution.rows;

  return {
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
    byStatus: statusCounts,
    byCategory: byCategory.rows,
    bySector: bySector.rows,
    resolved: res.resolved,
    averageHoursToResolve: res.hours === null ? null : Number(res.hours),
  };
}

module.exports = { stats };
