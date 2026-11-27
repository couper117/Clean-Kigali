# Clean Kigali API

Clean Kigali is a backend REST API that lets Kigali residents report sanitation
problems such as illegal dumping, overflowing bins and blocked drains. City
staff then follow each report until it is resolved.

Built with **Express.js 5** and **PostgreSQL**, documented with **Swagger**
(OpenAPI 3) and planned in **Jira**.

| | Link |
|---|---|
| Swagger docs (local) | http://localhost:3000/api-docs |
| Production API | _added after deployment_ |
| Production Swagger | _added after deployment_ |
| Jira board | _added when the project is created_ |

## Requirements

- Node.js 22 or newer
- PostgreSQL 14 or newer

## Getting started

```bash
git clone git@github.com:couper117/Clean-Kigali.git
cd Clean-Kigali
npm install
cp .env.example .env          # then edit DATABASE_URL to match your PostgreSQL
createdb clean_kigali_dev
createdb clean_kigali_test
npm run migrate               # create the tables
npm run migrate:test          # create them in the test database too
npm run seed                  # add sample data
npm run dev                   # http://localhost:3000/api-docs
```

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API and restart it when a file changes |
| `npm start` | Start the API (used in production) |
| `npm run migrate` | Run the SQL files in `db/migrations` that have not run yet |
| `npm run migrate:test` | The same, on the test database (`TEST_DATABASE_URL`) |
| `npm run seed` | Load sample data from `db/seeds` |
| `npm test` | Run the tests against `TEST_DATABASE_URL` |

## Environment variables

All settings come from environment variables. Locally they are read from
`.env`, which is never committed. `.env.example` lists every variable.

| Variable | Example | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `3000` | Port the API listens on |
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/clean_kigali_dev` | PostgreSQL connection |
| `DATABASE_SSL` | `true` | `true` or `false`: encrypted database connection. Empty = on in production, off otherwise |
| `TEST_DATABASE_URL` | `postgres://user:pass@localhost:5432/clean_kigali_test` | Database used by `npm test` |
| `JWT_SECRET` | 48 random bytes in hex | Signs login tokens. At least 32 characters in production |
| `JWT_EXPIRES_IN` | `8h` | How long a login lasts (`30m`, `8h`, `1d` or seconds) |
| `CORS_ORIGIN` | `*` | Which website may call the API from a browser |

### Development vs production

| | Development | Production |
|---|---|---|
| Request logs | Short, coloured (`dev`) | Full (`combined`) |
| Server errors | Message and stack trace returned | Generic message only |
| Database connection | Plain | Encrypted (TLS) |

Every variable is checked when the app starts. A missing `DATABASE_URL` or
`JWT_SECRET`, a `JWT_SECRET` shorter than 32 characters in production, an
unknown `NODE_ENV`, a `PORT` that is not a number or a `DATABASE_SSL` that is
not `true`/`false` stops the app with a message naming the variable.

## Production (Vercel + Neon)

The API runs on **Vercel** as one Node.js function, with a **Neon** PostgreSQL
database added through the Vercel Marketplace. Both are on free plans in
Frankfurt (`fra1` and `eu-central-1`), the closest region to Rwanda.

| Piece | Where it is set |
|---|---|
| Express app | `src/app.js`, found by Vercel automatically |
| Build | `vercel.json` runs `scripts/vercel-build.js` |
| Region | `vercel.json`: `fra1`, next to the database |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Added by the Neon integration |
| `NODE_ENV=production`, `JWT_SECRET`, `JWT_EXPIRES_IN` | Vercel > Settings > Environment Variables |

- **Deploys:** every merge into `main` deploys to production. Every pull
  request gets its own preview link to try in Swagger before review.
- **Migrations:** production deploys run `npm run migrate` during the build,
  on the direct (unpooled) database URL. If a migration fails, the build fails
  and the previous version stays online. Preview deploys do not migrate.
- **Seed data:** run once from a laptop against the production database:
  ```bash
  vercel env pull .env.production.local      # gitignored
  # copy DATABASE_URL_UNPOOLED from that file, then:
  DATABASE_URL='<that url>' DATABASE_SSL=true npm run seed
  ```
- **Secrets:** only in Vercel's settings and `.env` files, which are never
  committed.
- **Swagger UI:** Vercel does not serve files from `node_modules`, so the
  Swagger page loads its scripts and styles from the jsDelivr CDN at a fixed
  version (`src/docs/swagger.js`).
- **Database connections:** `attachDatabasePool` from `@vercel/functions`
  closes idle connections before Vercel pauses the function.
- **Locally**, `npm run dev` starts the same app with `src/server.js`.

## Project structure

```
src/
  server.js          starts the HTTP server
  app.js             builds the Express app: middleware, routes, docs, errors
  config/env.js      reads and checks environment variables
  db/pool.js         PostgreSQL connection pool
  docs/swagger.js    loads docs/swagger.yaml for Swagger UI
  routes/            URL -> controller, one file per resource
  controllers/       reads the request, calls a service, sends the response
  services/          SQL queries and business rules
  validators/        rules for request bodies and query strings
  middleware/        auth, validation, 404 and error handling
  utils/             small shared helpers
db/
  migrations/        numbered SQL files that build the schema
  seeds/             sample data
scripts/             migrate and seed runners
docs/swagger.yaml    the API documentation
tests/               API tests (node:test + supertest)
```

## Database migrations

The schema is built by numbered SQL files in `db/migrations`. `npm run migrate`
runs every file that has not run yet, in name order, and records it in the
`schema_migrations` table so it never runs twice.

- Each file runs inside a transaction: if any statement fails, the whole file
  is undone and nothing is recorded.
- A file that is still empty is a task not finished yet. The runner stops
  there and runs it, and the files after it, once it has SQL.
- Never edit a file that has already run. Add a new numbered file instead;
  the runner warns if an applied file changes.
- Two deploys cannot migrate at the same time (PostgreSQL advisory lock).

```
$ npm run migrate
applied 001_create_districts_and_sectors.sql
applied 002_create_categories.sql
waiting 003_create_users.sql is still empty; it and later files will run once it has SQL
```

## Logging in

Residents use the public routes without an account. Staff (roles `admin` and
`officer`) log in to get a token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@cleankigali.rw","password":"..."}'
```

Send the token on staff routes as `Authorization: Bearer <token>`. In Swagger,
click **Authorize** and paste it. A token lasts `JWT_EXPIRES_IN` (8 hours by
default). Deactivating an account stops its token working at once.

In route files:

```js
const { requireAuth, requireRole } = require('../middleware/auth');
router.get('/', requireAuth, list);                          // any staff member
router.delete('/:id', requireAuth, requireRole('admin'), remove); // admins only
```

Passwords are stored only as bcrypt hashes. Use `hashPassword()` from
`src/services/auth.service.js` (seeds, users service) so every hash has the
same cost.

## Error format

Every error has the same shape:

```json
{ "error": { "status": 404, "message": "Report not found" } }
```

Validation errors add a `details` list with one entry per invalid field.

## How we work

1. Pick a task in Jira and move it to **In Progress**.
2. Create a branch named after it: `git checkout -b CK001-21-category-routes`
3. Commit small steps, starting each message with the Jira key:
   `CK001-21: add category routes`
4. Push and open a pull request; a teammate reviews it before merging.
5. Move the Jira task to **Done**.
