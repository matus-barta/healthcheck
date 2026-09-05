# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single small Express service in TypeScript that answers `OK` on `/` and/or `/healthcheck`, published as a Docker image to `ghcr.io/matus-barta/healthcheck`. It exists to give an uptime monitor something to poll so that a whole chain — DDNS, reverse proxy, container — can be proven alive from outside. There is no database, no state and no second service.

| Path                   | What it is                                                                        |
| ---------------------- | --------------------------------------------------------------------------------- |
| `src/index.ts`         | Process entry: starts the listener, prints the config, exits 1 if both routes off |
| `src/app.ts`           | The Express app and the five config values read from `process.env`                |
| `src/routes.ts`        | The two handlers; each returns `OK` or 404 depending on config                    |
| `src/utils/logger.ts`  | pino + pino-pretty singleton                                                      |
| `src/utils/isoDate.ts` | ISO-8601 validator — currently imported by nothing                                |
| `__tests__/`           | supertest coverage of both routes across every config combination                 |
| `Dockerfile`           | Four-stage build (`base` → `fetch` → `build` / `prod` → final)                    |
| `docker-compose.yml`   | Consumer-facing example that _pulls_ the published image                          |

**The README states the intent explicitly: this repo is meant to be readable by a beginner.** The dense line-by-line comments in `src/` are the product, not clutter. Preserve them when editing, and comment new code in the same voice. Do not "clean up" the codebase by deleting explanation.

`src/app.ts` splits from `src/index.ts` so tests can import the app without starting a listener. Keep that seam: anything that binds a port or reads `process.argv` belongs in `index.ts`.

## The configuration rule

**Config is module-level mutable state, read once at import time, and `routes.ts` reads it per request.**

`app.ts` computes `port`, `host`, `useJSON`, `endpointRes` and `rootRes` at module scope. `routes.ts` imports the last three and dereferences them _inside_ the handlers, so a later mutation is visible. `setEnv()` exists only so tests can flip the flags between cases.

That is what makes the tests work, and it is fragile. Do not destructure the flags into locals at import time, cache them in a closure, or pass them into `routes()` as an argument — any of those freezes the value at import and silently breaks `setEnv()`.

### Three env-parsing traps

These are live behaviours of the current code, not hypotheticals. Read them before touching config or the docs.

**1. Any non-empty string is `true`.** The flags are parsed as `Boolean(process.env.X ?? default)`, and `Boolean('false') === true`. So `ENDPOINT_RES="false"` _enables_ the healthcheck endpoint. Only leaving the variable unset produces the documented default; `??` guards `null`/`undefined` only, so an empty string falls through to `Boolean('')` and yields `false` regardless of what the default was. The README, `.env.example` and `docker-compose.yml` all show `"false"` as if it disabled something; they are wrong. Fixing the parser is a behaviour change for anyone whose deployment currently relies on the truthiness, so raise it rather than quietly changing it.

**2. A `.env` file never reaches these values.** `index.ts` calls `dotenv.config()` in its body, but `import app from './app'` is evaluated first, and `app.ts` reads `process.env` at module scope. By the time dotenv loads the file, every value has already been captured. Only real process environment variables — what Docker's `environment:` block or a shell `export` provides — take effect. To make `.env` work, dotenv has to be loaded before `./app` is imported.

**3. Quotes in Compose are literal.** `- HOST="localhost"` in a Compose `environment:` list sets the value to `"localhost"` _including the quote characters_, which is not a resolvable host. Write `- HOST=localhost`.

## Commands

```bash
pnpm dev                          # ts-node-dev, respawns on change
pnpm build                        # tsc --build → build/
pnpm start                        # node . → build/src/index.js (build first)
pnpm test                         # jest — see the warning below
pnpm lint                         # prettier --check . && eslint .
pnpm format                       # prettier --write .
pnpm ncu / pnpm ncu-update        # npm-check-updates, report / apply
```

pnpm is the package manager, Node is 24 (`.nvmrc`, Dockerfile, both CI matrices). A move to 26 was tried and reverted in `32e7d5c`; stay on 24 unless the dependency tree is checked again.

Docker, for a local image rather than the published one:

```bash
docker build -t healthcheck .
docker run -p 8082:8082 healthcheck
```

**The root `docker-compose.yml` is documentation for users, not a dev loop.** It pulls `ghcr.io/matus-barta/healthcheck:latest` and has no `build:` key, so `docker compose up` will not exercise local changes.

## Testing

**`pnpm test` runs the same suite up to three times, and can fail intermittently.** Jest's only default ignore is `node_modules`, `tsconfig.json` sets no `include`/`exclude`, and `allowJs` is on — so `tsc --build` compiles the tests too, and jest collects every copy it finds:

```
__tests__/app.tests.ts          # the source
__tests__/app.tests.js          # stale output, gitignored, only on older working copies
build/__tests__/app.tests.js    # current output, present after any build
```

Every copy's `beforeEach` binds port 8082, so concurrent workers can collide on `EADDRINUSE`. Whether they actually do is a race, which is why the suite usually looks fine:

- **Two suites** (the `.ts` plus `build/`, which is what CI has) pass reliably, warm cache or cold. CI is not affected.
- **Three suites** — a working copy that still has the stale `__tests__/app.tests.js` — pass on a warm jest cache but fail on a cold one, because ts-jest transpiling the `.ts` copy stretches its run long enough to overlap the two `.js` copies. `pnpm exec jest --clearCache` before a run reproduces it.

So a green `pnpm test` here does not mean one suite ran; it usually means three ran and got lucky on scheduling. Deleting the stale `__tests__/app.tests.js*` (gitignored build leftovers, not source) removes the failure mode. The durable fix is a `testMatch` or `testPathIgnorePatterns` in `jest.config.js` pinning jest to `__tests__/*.ts`, so the duplicates can never be collected.

Note also that the `app.listen()` in `beforeEach` is not needed at all — `request(app)` makes supertest bind its own ephemeral port — so removing it would remove the port contention entirely.

Tests set `NODE_ENV=test`, which is the flag `routes.ts` checks to suppress the per-request log line. Keep that guard when adding logging to a request path, or the test output becomes unreadable.

## Docker image

Four stages. `fetch` installs the full dependency set from the frozen lockfile; `build` adds `tsconfig.json` and `src/` and compiles; `prod` re-runs the install with `--prod` to get a pruned `node_modules`; the final stage assembles `package.json`, the pruned modules and `build/`. Only `package.json`, the two lockfiles, `tsconfig.json` and `src/` ever enter the image, so tests and CI config cannot affect it.

`pino-pretty` is a **runtime** dependency, not a dev one, because `logger.ts` configures it as the transport unconditionally — including in production. Moving it to `devDependencies` breaks the image at startup.

The base image is pinned to an exact patch (`node:24.20.0-trixie-slim`) and bumped by Renovate. There is no `USER` directive, so the container runs as root; `docker-compose.yml` compensates with `no-new-privileges`.

## CI

`.github/workflows/docker-publish.yml` (named "CI") builds and tests on every push except the `documentation` branch, then on `master` only, publishes to GHCR tagged `:latest` and `:<sha>`.

`.github/workflows/lint.yml` runs `pnpm lint` on PRs to `main`/`master` and, on failure, comments telling the author to run `pnpm run format`.

The two workflows install different pnpm majors (11 in the publish workflow, 10 in the lint workflow) and the Dockerfile pins `pnpm@11`. There is no `packageManager` field in `package.json` to make them agree; adding one is the fix if this ever bites.

## Conventions

Prettier: tabs, single quotes, semicolons, no trailing commas, 100 columns.

**Prettier is not scoped away from the vendored skills, and `pnpm lint` currently fails because of it.** `.prettierignore` covers build output and lockfiles but not `.agents/` or `skills-lock.json`, so `prettier --check .` walks 36 vendored skill files it did not write, plus the lock file. That markdown contains annotated samples a formatter should not touch — add `.agents/` and `skills-lock.json` to `.prettierignore` rather than reformatting them.

Agent skills are vendored in `.agents/skills/` and symlinked into `.claude/skills/`, tracked by `skills-lock.json`. **Unlike some setups, `.agents/` is committed here** — both the vendored files and the symlinks are in git. Manage them with the `skills` CLI (`pnpm dlx skills add|remove|list|update ...`) rather than hand-editing the vendored trees or the lock file; `remove <name> -y` deletes the directory, the symlink and the lock entry together.

Open work lives in the **TODO section of `README.md`** — there is no `todo.md`. Remove an entry once it is implemented instead of leaving it as a record of completed work.

Commit subjects have no enforced convention. Renovate produces `Update dependency <x> to v<n> (#<pr>)`; human commits are lowercase free text (`add skills`, `pnpm allow build`). Match the surrounding log rather than importing a scheme from elsewhere.

Licensed MIT.

The README carries an explicit disclaimer that the author is a hobbyist and welcomes issues and PRs. Keep that tone in documentation: plain, unhedged, aimed at someone learning.

## AI policy

`.claude/ai-policy.md` governs AI-assisted work in this repository. Read it before acting; the constraints below are the parts that bind a session here, not a summary of the whole document.

**A human creates the commit.** An AI tool may prepare changes in a supervised local working tree, but the human contributor reviews the complete result, selects what goes in, and commits personally — and must be able to explain every substantive part of it. So: prepare and explain changes, then stop. Do not commit, amend, push, tag, open or merge a pull request, cut a release, or publish a package. That includes the GHCR image this repo publishes.

**Do not touch repository settings, branch protections, secrets, or deployments.** Nothing in this repo needs them, and the policy puts them out of scope regardless.

**Never paste secrets into a prompt or a file** — tokens, keys, `.env` contents from a real deployment. Use the placeholder values from `.env.example` when an example is needed.

**Do not invent APIs, dependencies, references, or test results.** The policy lists fabrication as grounds for rejecting a contribution outright, and it names "appears plausible, compiles, or passes automated checks" as insufficient. When a claim about this codebase is uncertain, verify it or say it is unverified.

If AI assistance was material to a change, the policy asks for a short disclosure in the pull request; it gives suggested wording, and exempts trivial help like spelling or formatting.

The document was adapted from another repository and has been reconciled with this one: it now names `MIT` as the project licence, and the clauses about database migrations and location telemetry — neither of which exists here — have been removed.
