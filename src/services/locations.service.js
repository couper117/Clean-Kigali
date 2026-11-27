// Districts and sectors of Kigali (loaded by the first migration, read-only here).
const db = require('../db/pool');
const AppError = require('../utils/AppError');

async function listDistricts() {
  const { rows } = await db.query(
    `SELECT d.id, d.name, count(s.id)::int AS sector_count
       FROM districts d LEFT JOIN sectors s ON s.district_id = d.id
      GROUP BY d.id ORDER BY d.name`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, sectorCount: r.sector_count }));
}

async function listSectors({ districtId } = {}) {
  const { rows } = await db.query(
    `SELECT s.id, s.name, d.id AS district_id, d.name AS district_name
       FROM sectors s JOIN districts d ON d.id = s.district_id
      WHERE $1::int IS NULL OR s.district_id = $1
      ORDER BY d.name, s.name`,
    [districtId ?? null],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, district: { id: r.district_id, name: r.district_name } }));
}

async function sectorsOfDistrict(districtId) {
  const { rows } = await db.query('SELECT 1 FROM districts WHERE id = $1', [districtId]);
  if (!rows.length) throw new AppError(404, 'District not found');
  return listSectors({ districtId });
}

module.exports = { listDistricts, listSectors, sectorsOfDistrict };
