# AGENTS.md

Guidance for AI coding agents working in this repository. Every session reads this file, so it stays short: rules and pointers only. The substance lives in `docs/`.

## Project

A term project for a database course. It moves the gown rental and St:talk registration features of grad42, a live Firebase service, onto MySQL, and explains the result in a six-page report. **It is built for the assignment and will not be used in production.**

For current progress, see the decision list and the open items in `docs/README.md`.

## Where to look

| Task | Read first |
|---|---|
| Anything | `docs/README.md` — full doc list, decision statuses, open items |
| Judging scope | `docs/decisions/scope.md`, `project-positioning.md` |
| Tables, constraints, DDL | `docs/decisions/data-model.md` |
| DB accounts, `GRANT`, views | `docs/decisions/db-privileges.md` |
| Servers and API | `docs/decisions/admin-server-split.md`, `docs/contracts/web-api.md` |
| Runtime environment | `docs/decisions/mysql-docker.md`, `local-only.md`, `tech-stack.md` |
| Tests and CI | `docs/testing/README.md`, `docs/decisions/ci.md` |
| The report | `docs/requirements/report-requirements.md`, `docs/decisions/evaluation.md` |
| Assignment conditions | `docs/requirements/course-requirements.md` |
| Rules of the original service | `~/dev/projects/grad42`. Source documents are listed under "원본 서비스" in `docs/README.md` |

The documents under `docs/` are written in Korean.

## Hard rules

1. **Stay in scope.** Do not build production-grade security (encryption, rate limiting, mail delivery). If something outside the scope is needed, change `scope.md` first.
2. **No real personal data.** Seed data, tests, docs, and screenshots use made-up values only.
3. **This is a public repository.** Never commit the course slides (`docs/course-materials/`) or real secrets.
4. **No deployment.** The project runs locally and in CI only.
5. **The grad42 repository is read-only.** Do not edit it or commit to it.
6. **MySQL runs in Docker, and tests that touch the database run against real MySQL.** No substitute databases such as H2.
7. **Write DDL by hand.** Do not let a framework generate the schema. Keep the key queries visible as SQL.
8. **Server code guards the boundary between users.** In the student server, every query on reservations or registrations filters by user ID. Database privileges only separate roles.
9. **Do not present unverified work as verified.** A design that has not been run stays marked as a draft, with what remains to be checked listed in its document.

## Handling decisions

- One decision per document in `docs/decisions/`. Each document opens with its status and date.
- Statuses: **확정** (decided by the user), **잠정** (a proposal the user did not object to), **초안·제안** (not yet confirmed). Never record something as 확정 unless the user decided it.
- Do not settle an open item on your own. Propose an option with reasons and get confirmation.
- When a decision is made or changes, update its document, every document it affects, and the decision list and open-items table in `docs/README.md`.
- Record what you learn during implementation (unexpected behavior, differences from the original service) in the relevant document. The report's retrospective draws on it.
- Keep each document in the language it is already written in. New documents may be in English or Korean. Check that relative links resolve.

## Branches and commits

- Documentation work is committed on the `docs` branch and merged into `main` when the writing is done.
- Code work is done on a feature branch (for example `feat/schema`) and merged into `main`.
- Push only when asked.
- Commit messages are written in English: a conventional prefix plus an imperative summary, for example `docs: add the test plan`. Add a body when the reason is not obvious from the summary.
- Do not add AI attribution to commit messages. No `Co-Authored-By` trailer and no session link.
- Once code exists, run the static checks before committing (`docs/testing/static.md`).
