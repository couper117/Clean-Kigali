# Live demo script and Swagger test run

Jira: CK001-31. The demo runs in Swagger on the production URL, so the panel
sees the real deployed API. It takes 5 minutes, and each member shows the
endpoints they built.

Production Swagger: **https://cleankigali.vercel.app/api-docs**
Production API: https://cleankigali.vercel.app/api/health

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

## Full test run on production

Every endpoint was called once on the production URL after the final deploy.
Test records (a category, a staff account and a report) were deleted afterwards,
so the data is back to the seed: 3 staff, 6 categories, 15 reports.

Tested by: Kenny Kelvin, with a script written by Claude (AI) | Date: 27 Nov 2026 | Commit: `90d2c17` | Result: **30 of 30 passed**

**Run it again on 29 November** if any code changes after this, this time by
clicking through the production Swagger, and update this table.

| Endpoint | Case | Expected | Result |
|---|---|---|---|
| `GET /api/health` | Normal | 200 | ✅ 200 |
| `GET /api-docs` | Page loads | 200 | ✅ 200 |
| `POST /api/auth/login` | Right password | 200 + token | ✅ 200 |
| `POST /api/auth/login` | Wrong password | 401 | ✅ 401 |
| `POST /api/auth/login` | Empty body | 400 | ✅ 400 |
| `GET /api/auth/me` | With token / without | 200 / 401 | ✅ 200 / 401 |
| `GET /api/districts` | Normal | 200 | ✅ 200 |
| `GET /api/districts/{id}/sectors` | Known id / unknown id | 200 / 404 | ✅ 200 / 404 |
| `GET /api/sectors` | Normal | 200 | ✅ 200 |
| `GET /api/categories` | Normal | 200 | ✅ 200 |
| `GET /api/categories/{id}` | Known id / unknown id | 200 / 404 | ✅ 200 / 404 |
| `POST /api/categories` | Admin / duplicate name / officer | 201 / 409 / 403 | ✅ 201 / 409 / 403 |
| `PUT /api/categories/{id}` | Admin | 200 | ✅ 200 |
| `DELETE /api/categories/{id}` | Unused / still used by reports | 204 / 409 | ✅ 204 / 409 |
| `GET /api/users` | Admin / officer | 200 / 403 | ✅ 200 / 403 |
| `GET /api/users/{id}` | Known id / unknown id | 200 / 404 | ✅ 200 / 404 |
| `POST /api/users` | New email / duplicate email | 201 / 409 | ✅ 201 / 409 |
| `PUT /api/users/{id}` | Admin | 200 | ✅ 200 |
| `DELETE /api/users/{id}` | Admin | 204 | ✅ 204 |
| `POST /api/reports` | Full body / empty body / unknown category | 201 / 400 / 400 | ✅ 201 / 400 / 400 |
| `GET /api/reports` | Token / no token / `limit=500` | 200 / 401 / 400 | ✅ 200 / 401 / 400 |
| `GET /api/reports/track/{reference}` | Known / unknown / malformed | 200 / 404 / 400 | ✅ 200 / 404 / 400 |
| `GET /api/reports/{id}` | Known id / unknown id | 200 / 404 | ✅ 200 / 404 |
| `PUT /api/reports/{id}` | Full body / missing title | 200 / 400 | ✅ 200 / 400 |
| `PATCH /api/reports/{id}` | Priority / with `status` | 200 / 400 | ✅ 200 / 400 |
| `PATCH /api/reports/{id}/status` | Allowed move / not allowed | 200 / 409 | ✅ 200 / 409 |
| `GET /api/reports/{id}/updates` | Normal | 200 | ✅ 200 |
| `GET /api/reports/stats` | Normal | 200 | ✅ 200 |
| `DELETE /api/reports/{id}` | Admin / officer | 204 / 403 | ✅ 204 / 403 |
| Unknown route | `GET /api/nothing` | 404 | ✅ 404 |
