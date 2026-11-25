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
npm run seed                  # add sample data
npm run dev                   # http://localhost:3000/api-docs
```

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API and restart it when a file changes |
| `npm start` | Start the API (used in production) |
| `npm run migrate` | Run the SQL files in `db/migrations` that have not run yet |
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
| `DATABASE_SSL` | `true` | Force an encrypted database connection (on by default in production) |
| `TEST_DATABASE_URL` | `postgres://user:pass@localhost:5432/clean_kigali_test` | Database used by `npm test` |
| `CORS_ORIGIN` | `*` | Which website may call the API from a browser |

### Development vs production

| | Development | Production |
|---|---|---|
| Request logs | Short, coloured (`dev`) | Full (`combined`) |
| Server errors | Message and stack trace returned | Generic message only |
| Database connection | Plain | Encrypted (TLS) |

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
