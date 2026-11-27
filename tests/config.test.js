// Checks the settings for each environment. Each case runs in a fresh Node process
// from an empty folder, so the developer's own .env file cannot affect the result.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src');
const BASE = { PATH: process.env.PATH, DATABASE_URL: 'postgres://user:pass@db.example:5432/app', JWT_SECRET: 'x'.repeat(32) };

// Runs `code` with only the given environment variables; returns its JSON output or its error.
function run(code, env) {
  const result = spawnSync(process.execPath, ['-e', code], { cwd: os.tmpdir(), env: { ...BASE, ...env }, encoding: 'utf8' });
  if (result.status !== 0) return { error: result.stderr };
  return JSON.parse(result.stdout);
}
const loadConfig = (env) => run(`console.log(JSON.stringify(require(${JSON.stringify(SRC + '/config/env')})))`, env);

test('development is the default: short logs, no TLS, port 3000', () => {
  const c = loadConfig({});
  assert.equal(c.env, 'development');
  assert.equal(c.logFormat, 'dev');
  assert.equal(c.databaseSsl, false);
  assert.equal(c.port, 3000);
});

test('production: full logs and TLS to the database', () => {
  const c = loadConfig({ NODE_ENV: 'production', PORT: '10000' });
  assert.equal(c.isProduction, true);
  assert.equal(c.logFormat, 'combined');
  assert.equal(c.databaseSsl, true);
  assert.equal(c.port, 10000);
});

test('DATABASE_SSL=false turns TLS off even in production', () => {
  assert.equal(loadConfig({ NODE_ENV: 'production', DATABASE_SSL: 'false' }).databaseSsl, false);
});

test('a missing DATABASE_URL stops the app', () => {
  assert.match(loadConfig({ DATABASE_URL: '' }).error, /Missing required environment variable: DATABASE_URL/);
});

test('wrong values stop the app with a clear message', () => {
  assert.match(loadConfig({ NODE_ENV: 'prod' }).error, /NODE_ENV must be one of development, test, production/);
  assert.match(loadConfig({ PORT: 'abc' }).error, /PORT must be a whole number/);
  assert.match(loadConfig({ DATABASE_SSL: 'yes' }).error, /DATABASE_SSL must be "true" or "false"/);
});

test('JWT settings: required, long in production, valid duration', () => {
  assert.equal(loadConfig({}).jwtExpiresIn, '8h');
  assert.equal(loadConfig({ JWT_EXPIRES_IN: '3600' }).jwtExpiresIn, 3600);
  assert.match(loadConfig({ JWT_SECRET: '' }).error, /Missing required environment variable: JWT_SECRET/);
  assert.match(loadConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' }).error, /at least 32 characters/);
  assert.equal(loadConfig({ JWT_SECRET: 'short' }).env, 'development');
  assert.match(loadConfig({ JWT_EXPIRES_IN: 'soon' }).error, /JWT_EXPIRES_IN must be/);
});

// Calls the error handler with a fake response and prints what it would send.
const handleError = (env) => run(`
  const handler = require(${JSON.stringify(SRC + '/middleware/errorHandler')});
  const res = { status(code) { this.code = code; return this; }, json(body) { console.log(JSON.stringify({ code: this.code, body })); } };
  console.error = () => {};
  handler(new Error('password authentication failed for user "app"'), {}, res, () => {});
`, env);

test('production hides the details of server errors', () => {
  const { code, body } = handleError({ NODE_ENV: 'production' });
  assert.equal(code, 500);
  assert.equal(body.error.message, 'Something went wrong on our side');
  assert.equal(body.error.stack, undefined);
});

test('development shows the message and stack of server errors', () => {
  const { body } = handleError({ NODE_ENV: 'development' });
  assert.match(body.error.message, /password authentication failed/);
  assert.ok(body.error.stack);
});
