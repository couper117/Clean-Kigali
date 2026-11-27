# Live demo script and Swagger test run

Jira: CK001-31. The demo runs in Swagger on the production URL, so the panel
sees the real deployed API. It takes 5 minutes, and each member shows the
endpoints they built.

Production Swagger: _added after deployment (CK001-30, Vercel)_

## Before the slot (Monday 30 November)

- [ ] **15 minutes before:** open `/api/health` and `/api-docs` on the
      production URL, so the function and the Neon database are awake.
- [ ] Check `/api/health` shows `"environment": "production"` and `"database": "up"`.
- [ ] Have the seeded admin and officer logins written down. They are never
      in the repository or on the slides.
- [ ] Open the Swagger page in one tab and the Jira board in another.
- [ ] **Backup:** run the API on a laptop (`npm run dev`) with the same seed,
      in case the venue's internet fails.

## Demo order (5 minutes)

| # | Time | Who | Request in Swagger | What to point out |
|---|---|---|---|---|
| 1 | 0:00 | Kenny | `GET /api/health` | 200, production, database up: the live API on Vercel |
| 2 | 0:20 | Utuje | `GET /api/districts`, then `GET /api/districts/{id}/sectors` | Kigali's 3 districts and their sectors, from the seed |
| 3 | 0:45 | Utuje | `GET /api/categories` | The problem types a resident can choose |
| 4 | 1:05 | Kenny | `POST /api/reports` with an **empty body** | **Error case:** 400 with one message per missing field |
| 5 | 1:30 | Kenny | `POST /api/reports` with a full body | 201 and a reference code. Copy the code and the id |
| 6 | 1:55 | Kenny | `GET /api/reports/track/{reference}` | A resident follows the report: status `new`, no personal data shown |
| 7 | 2:15 | Kenny | `POST /api/auth/login` with a **wrong password**, then the right one | 401, then a token. Click **Authorize** and paste it |
| 8 | 2:45 | Kenny | `GET /api/reports?status=new&limit=5` | Filters and pages: `pagination.total` |
| 9 | 3:05 | Kenny | `PATCH /api/reports/{id}` with `{"priority":"high","assignedTo":2}` | Assigned to an officer |
| 10 | 3:20 | Deborah | `PATCH /api/reports/{id}/status` → `in_progress`, then `resolved` | Each change is recorded; `resolvedAt` is set |
| 11 | 3:50 | Deborah | `PATCH /api/reports/{id}/status` → `new` on the resolved report | **Error case:** 409, resolved is final |
| 12 | 4:05 | Kenny | `GET /api/reports/track/{reference}` again | The resident now sees the full history |
| 13 | 4:20 | Deborah | `GET /api/reports/stats` | Counts by status, category and sector; average hours to resolve |
| 14 | 4:40 | Deborah | `GET /api/users` | Staff accounts; no password hashes in the response |

If time is short, skip steps 3, 8 and 14.

## Full Swagger test run on production (29 November)

Run every endpoint once on the production Swagger after the final deploy and
fill in the result. Anything that fails is fixed and re-tested before the code
freeze.

Tested by: ________ Date: ________ Commit: ________

| Endpoint | Case | Expected | Result |
|---|---|---|---|
| `GET /api/health` | Normal | 200 | |
| `GET /api-docs` | Page loads | 200 | |
| `POST /api/auth/login` | Right password | 200 + token | |
| `POST /api/auth/login` | Wrong password | 401 | |
| `POST /api/auth/login` | Empty body | 400 | |
| `GET /api/auth/me` | With token / without | 200 / 401 | |
| `GET /api/districts` | Normal | 200 | |
| `GET /api/districts/{id}/sectors` | Known id / unknown id | 200 / 404 | |
| `GET /api/sectors` | Normal | 200 | |
| `GET /api/categories` | Normal | 200 | |
| `GET /api/categories/{id}` | Known id / unknown id | 200 / 404 | |
| `POST /api/categories` | Admin / duplicate name / officer | 201 / 409 / 403 | |
| `PUT /api/categories/{id}` | Admin | 200 | |
| `DELETE /api/categories/{id}` | Unused / still used by reports | 204 / 409 | |
| `GET /api/users` | Admin / officer | 200 / 403 | |
| `GET /api/users/{id}` | Known id / unknown id | 200 / 404 | |
| `POST /api/users` | New email / duplicate email | 201 / 409 | |
| `PUT /api/users/{id}` | Admin | 200 | |
| `DELETE /api/users/{id}` | Admin | 204 | |
| `POST /api/reports` | Full body / empty body / unknown category | 201 / 400 / 400 | |
| `GET /api/reports` | Token / no token / `limit=500` | 200 / 401 / 400 | |
| `GET /api/reports/track/{reference}` | Known / unknown / malformed | 200 / 404 / 400 | |
| `GET /api/reports/{id}` | Known id / unknown id | 200 / 404 | |
| `PUT /api/reports/{id}` | Full body / missing title | 200 / 400 | |
| `PATCH /api/reports/{id}` | Priority / with `status` | 200 / 400 | |
| `PATCH /api/reports/{id}/status` | Allowed move / not allowed | 200 / 409 | |
| `GET /api/reports/{id}/updates` | Normal | 200 | |
| `GET /api/reports/stats` | Normal | 200 | |
| `DELETE /api/reports/{id}` | Admin / officer | 204 / 403 | |
| Unknown route | `GET /api/nothing` | 404 | |
