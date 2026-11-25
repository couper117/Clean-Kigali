# Roadmap to the 30 November presentation

This plan maps every requirement of the SPEPL401 final assessment to a piece of
work, a Jira task and a day. All 34 tasks with descriptions and estimates are
in [jira-tasks.csv](jira-tasks.csv), ready to import into Jira; who owns each
one is in [TASKS.md](TASKS.md) and the team is in [TEAM.md](TEAM.md).

## Day by day

| Day | Code | Documents |
|---|---|---|
| Wed 25 Nov | Express setup, Swagger, error handling, database connection and migration runner | Problem statement, scope, start stakeholder survey |
| Thu 26 Nov | Migrations, seed data, validation, login with JWT | Feasibility study, SRS |
| Fri 27 Nov | Locations, categories, users and reports CRUD | Charter, WBS, schedule, budget, risks |
| Sat 28 Nov | Status updates, statistics, tests, first deploy to Render | Team roles, communication plan, pitch |
| Sun 29 Nov | Fix bugs, test every endpoint live on Render, freeze code | Evaluation, 10 slides, rehearsal |
| Mon 30 Nov | **Presentation.** Push everything before the team's slot | |

## Where each mark comes from

| Task | Marks | What proves it |
|---|---|---|
| 1. Jira tasks | 10 | Equal share per member, each task has a description, an estimate and an up-to-date status |
| 2. Tasks completed | 15 | Tasks Done in Jira, the Jira key in every commit (`CK001-12: ...`) |
| 3. Commit history | 15 | Small commits from **your own** GitHub account, spread over the days, on branches merged by pull request with a review |
| 4. Individual defence | 10 | Each member can explain and change their own code |
| 5. Identification and planning | 8 | SRS and project plan documents, slides 2 to 7 |
| 6. Express and PostgreSQL setup | 8 | `src/` structure, npm scripts, README, `db/migrations`, `db/seeds` |
| 7. Dev and production | 6 | `.env.example`, `NODE_ENV` behaviour, `.env` never committed, live Render URL |
| 8. Working backend | 8 | Full CRUD, validation, correct status codes, central error handler |
| 9. Swagger and live testing | 10 | Every endpoint at `/api-docs` with schemas and responses, one error case shown live |
| 10. Presentation and pitch | 10 | Exactly 10 slides, every member speaks, 8 to 10 minutes |

## Data model

| Table | Holds | Links |
|---|---|---|
| `districts` | Gasabo, Kicukiro, Nyarugenge | |
| `sectors` | The 35 sectors of Kigali | belongs to a district |
| `categories` | Kinds of problem (illegal dumping, full bin, blocked drain, ...) | |
| `users` | Staff accounts: admins and sector officers | may belong to a sector |
| `reports` | A problem reported by a resident | category, sector, assigned officer |
| `report_updates` | Every status change and note on a report | report (deleted with it), user who made it |

## Importing the tasks into Jira

1. Create a Jira **Scrum** software project with the key `CK001`.
2. Make sure time tracking is on, so **Original estimate** can be filled.
3. Go to **Settings > System > External system import > CSV**, or use the
   project's **Import issues** option, and choose `jira-tasks.csv`.
   Import into the empty project in one go, so the keys come out as
   CK001-1 to CK001-34 in the same order as [TASKS.md](TASKS.md).
4. Map the columns: Summary, Issue Type, Description, Original Estimate
   (given in seconds), Labels, Priority.
5. Assign each task to the owner listed in [TASKS.md](TASKS.md).
6. Add the instructor to the Jira project and to the GitHub repository.

## Rules to remember

- Commit only from your own GitHub account. No commits means 0 for Task 3.
- Never commit `.env` or passwords. Only `.env.example` goes to GitHub.
- Commits made after the team's slot starts are not marked.
