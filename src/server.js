// Entry point: starts the HTTP server and shuts it down cleanly.
const app = require('./app');
const config = require('./config/env');
const { pool } = require('./db/pool');

const server = app.listen(config.port, () => {
  console.log(`Clean Kigali API (${config.env}) listening on http://localhost:${config.port}`);
  console.log(`Swagger docs: http://localhost:${config.port}/api-docs`);
});

// Render sends SIGTERM before replacing the app; finish open requests, then close the pool.
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// A promise that failed with nobody handling it means the app is in an unknown state.
// Log it and exit with an error; Render then starts a fresh copy.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});
