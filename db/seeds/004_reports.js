// CK001-17: 15 sample reports spread over the last three weeks, with their status
// history. Each has a fixed reference, so running the seed again adds nothing.
const REPORTS = [
  // reference, title, category, sector, status, priority, days ago, officer
  ['CK-SD7K2A', 'Rubbish dumped behind the market', 'Illegal dumping', 'Kimironko', 'new', 'high', 1, null],
  ['CK-SD4M9Q', 'Bin full for a week near the bus stop', 'Overflowing bin', 'Remera', 'new', 'medium', 2, null],
  ['CK-SD8P3R', 'Drain blocked after the rain', 'Blocked drain', 'Nyamirambo', 'new', 'high', 2, null],
  ['CK-SD2W6T', 'Waste not collected on Tuesday', 'Missed collection', 'Gikondo', 'new', 'low', 3, null],
  ['CK-SD5X7Y', 'Plastic burned on an open plot', 'Burning waste', 'Kanombe', 'new', 'medium', 4, null],
  ['CK-SD3B8C', 'Sacks of waste by the river bank', 'Illegal dumping', 'Gisozi', 'in_progress', 'high', 5, 'officer.gasabo@cleankigali.rw'],
  ['CK-SD9D4E', 'Public toilet at the taxi park is closed', 'Dirty public toilet', 'Nyarugenge', 'in_progress', 'medium', 6, 'officer.nyarugenge@cleankigali.rw'],
  ['CK-SD6F2G', 'Bins overflowing outside the school', 'Overflowing bin', 'Kacyiru', 'in_progress', 'high', 8, 'officer.gasabo@cleankigali.rw'],
  ['CK-SD4H7J', 'Gutter blocked with plastic bottles', 'Blocked drain', 'Kimisagara', 'in_progress', 'medium', 9, 'officer.nyarugenge@cleankigali.rw'],
  ['CK-SD8K3L', 'Building waste left on the road', 'Illegal dumping', 'Kimironko', 'resolved', 'medium', 12, 'officer.gasabo@cleankigali.rw'],
  ['CK-SD2M5N', 'Collection missed for two weeks', 'Missed collection', 'Muhima', 'resolved', 'high', 14, 'officer.nyarugenge@cleankigali.rw'],
  ['CK-SD7P9Q', 'Drain flooding the footpath', 'Blocked drain', 'Remera', 'resolved', 'high', 16, 'officer.gasabo@cleankigali.rw'],
  ['CK-SD3R6S', 'Full bin at the health centre', 'Overflowing bin', 'Nyamirambo', 'resolved', 'low', 18, 'officer.nyarugenge@cleankigali.rw'],
  ['CK-SD5T8U', 'Smoke from burning waste at night', 'Burning waste', 'Kicukiro', 'rejected', 'low', 19, null],
  ['CK-SD9V2W', 'Waste dumped by the main road', 'Illegal dumping', 'Gatenga', 'rejected', 'medium', 20, null],
];

module.exports = async function seedReports(client, { log }) {
  let added = 0;
  for (const [reference, title, category, sector, status, priority, daysAgo, officer] of REPORTS) {
    const { rows: [report] } = await client.query(
      `INSERT INTO reports (reference, title, description, category_id, sector_id, status, priority,
                            assigned_to, reporter_name, reporter_phone, created_at, updated_at, resolved_at)
       SELECT $1, $2, $3, c.id, s.id, $4::varchar, $5,
              (SELECT id FROM users WHERE lower(email) = $6),
              'Sample resident', '0788000000',
              now() - make_interval(days => $7::int), now() - make_interval(days => $7::int),
              CASE WHEN $4::varchar = 'resolved' THEN now() - make_interval(days => $7::int) + interval '2 days 5 hours' END
         FROM categories c, sectors s
        WHERE c.name = $8 AND s.name = $9
       ON CONFLICT (reference) DO NOTHING
       RETURNING id, created_at, assigned_to`,
      [reference, title, `${title}. Sample report loaded by the seed script.`, status, priority,
        officer, daysAgo, category, sector],
    );
    if (!report) continue; // already there
    added += 1;

    // The status changes that led to the current status, one day apart.
    const admin = '(SELECT id FROM users WHERE lower(email) = \'admin@cleankigali.rw\')';
    const steps = {
      new: [],
      in_progress: [['new', 'in_progress', 'Officer assigned and on the way']],
      resolved: [['new', 'in_progress', 'Officer assigned and on the way'], ['in_progress', 'resolved', 'Area cleaned and checked']],
      rejected: [['new', 'rejected', 'Duplicate of an earlier report']],
    }[status];
    for (const [i, [from, to, note]] of steps.entries()) {
      await client.query(
        `INSERT INTO report_updates (report_id, user_id, old_status, new_status, note, created_at)
         VALUES ($1, COALESCE($2, ${admin}), $3, $4, $5, $6::timestamptz + make_interval(hours => $7::int))`,
        [report.id, report.assigned_to, from, to, note, report.created_at, to === 'resolved' ? 53 : 3 + i * 24],
      );
    }
  }
  log(`added   ${added} of ${REPORTS.length} sample reports`);
};
