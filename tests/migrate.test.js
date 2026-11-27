// Tests the migration runner with throwaway SQL files in a temporary folder.
// It records them in its own table, so the real schema_migrations is never touched.
const { pool } = require('./helpers');
const { migrate, hasSql } = require('../scripts/migrate');
const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TABLE = 'test_schema_migrations';
const quiet = () => {};
let dir;

function write(name, sql) {
  fs.writeFileSync(path.join(dir, name), sql);
}

async function tableExists(name) {
  const { rows } = await pool.query('SELECT to_regclass($1) AS t', [name]);
  return rows[0].t !== null;
}

async function cleanUp() {
  await pool.query(`DROP TABLE IF EXISTS mig_test_b, mig_test_a, ${TABLE}`);
}

beforeEach(async () => {
  await cleanUp();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-migrations-'));
});

after(async () => {
  await cleanUp();
  await pool.end();
});

test('applies new files in name order and records each one', async () => {
  write('002_b.sql', 'CREATE TABLE mig_test_b (id INT REFERENCES mig_test_a(id));');
  write('001_a.sql', 'CREATE TABLE mig_test_a (id INT PRIMARY KEY);');

  const applied = await migrate({ dir, table: TABLE, log: quiet });

  assert.deepEqual(applied, ['001_a.sql', '002_b.sql']);
  assert.ok(await tableExists('mig_test_b'));
  const { rows } = await pool.query(`SELECT filename FROM ${TABLE} ORDER BY filename`);
  assert.deepEqual(rows.map((r) => r.filename), ['001_a.sql', '002_b.sql']);
});

test('running again applies nothing', async () => {
  write('001_a.sql', 'CREATE TABLE mig_test_a (id INT PRIMARY KEY);');
  await migrate({ dir, table: TABLE, log: quiet });

  const applied = await migrate({ dir, table: TABLE, log: quiet });
  assert.deepEqual(applied, []);
});

test('a failing file is rolled back and not recorded', async () => {
  write('001_a.sql', 'CREATE TABLE mig_test_a (id INT PRIMARY KEY);');
  write('002_b.sql', 'CREATE TABLE mig_test_b (id INT); SELECT * FROM no_such_table;');

  await assert.rejects(migrate({ dir, table: TABLE, log: quiet }), /002_b\.sql failed and was rolled back/);

  assert.ok(await tableExists('mig_test_a'), '001 stays applied');
  assert.equal(await tableExists('mig_test_b'), false, '002 left nothing behind');
  const { rows } = await pool.query(`SELECT filename FROM ${TABLE}`);
  assert.deepEqual(rows.map((r) => r.filename), ['001_a.sql']);
});

test('stops at an empty file so later files wait their turn', async () => {
  write('001_a.sql', '-- to be written in a later task\n');
  write('002_b.sql', 'CREATE TABLE mig_test_b (id INT);');
  const messages = [];

  const applied = await migrate({ dir, table: TABLE, log: (m) => messages.push(m) });

  assert.deepEqual(applied, []);
  assert.equal(await tableExists('mig_test_b'), false);
  assert.match(messages.join('\n'), /waiting 001_a\.sql/);
});

test('warns when a file is edited after it ran', async () => {
  write('001_a.sql', 'CREATE TABLE mig_test_a (id INT PRIMARY KEY);');
  await migrate({ dir, table: TABLE, log: quiet });
  write('001_a.sql', 'CREATE TABLE mig_test_a (id BIGINT PRIMARY KEY);');
  const messages = [];

  await migrate({ dir, table: TABLE, log: (m) => messages.push(m) });
  assert.match(messages.join('\n'), /warning 001_a\.sql changed after it ran/);
});

test('hasSql ignores blank lines and comments', () => {
  assert.equal(hasSql(''), false);
  assert.equal(hasSql('  \n-- just a note\n'), false);
  assert.equal(hasSql('SELECT 1; -- note'), true);
});

test('rejects unsafe table names', async () => {
  await assert.rejects(migrate({ dir, table: 'x; DROP TABLE users', log: quiet }), /Invalid migrations table name/);
});
