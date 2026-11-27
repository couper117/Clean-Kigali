// Vercel runs this on every deploy (buildCommand in vercel.json).
//
// Production deploys bring the production database up to date before the new code
// goes live. If a migration fails, the build fails and the previous version stays online.
// Preview deploys (one per pull request) do not migrate, so a pull request can never
// change the production schema before it is reviewed and merged.
const { migrate } = require('./migrate');
const { pool } = require('../src/db/pool');

if (process.env.VERCEL_ENV !== 'production') {
  console.log(`Skipping migrations on a ${process.env.VERCEL_ENV || 'local'} build`);
} else {
  migrate()
    .catch((err) => {
      console.error(`Migration failed: ${err.message || err.code || err}`);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
