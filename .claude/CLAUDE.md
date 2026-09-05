# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single small Express service in TypeScript that answers `OK` on `/` and/or `/healthcheck`, published as a Docker image to `ghcr.io/matus-barta/healthcheck`. It exists to give an uptime monitor something to poll so that a whole chain — DDNS, reverse proxy, container — can be proven alive from outside. There is no database, no state and no second service.

| Path                  | What it is                                                                        |
| --------------------- | --------------------------------------------------------------------------------- |
| `src/index.ts`        | Process entry: starts the listener, prints the config, exits 1 if both routes off |
| `src/app.ts`          | The Express app and the five config values read from `process.env`                |
| `src/routes.ts`       | The two handlers; each returns `OK` or 404 depending on config                    |
| `src/utils/logger.ts` | pino + pino-pretty singleton                                                      |
| `__tests__/`          | supertest coverage of both routes across every config combination                 |
| `Dockerfile`          | Four-stage build (`base` → `fetch` → `build` / `prod` → final)                    |
| `docker-compose.yml`  | Consumer-facing example that _pulls_ the published image                          |

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

`tsconfig.json` sets `"include": ["src"]`, so `tsc --build` compiles only the application and `build/` never contains a second copy of the tests. Keep it that way: without it, jest collects the compiled duplicates alongside the source suite, because its only default ignore is `node_modules` and `allowJs` is on.

That mattered because the tests used to share one listener on the configured port. They no longer call `app.listen()` at all — `request(app)` makes supertest bind its own ephemeral port per request — so there is nothing for parallel workers to contend over. Do not reintroduce a `beforeEach` that binds `port`; it produced an `EADDRINUSE` flake that failed approximately one cold-cache run in ten, and CI clears its jest cache on every run.

Tests set `NODE_ENV=test`, which is the flag `routes.ts` checks to suppress the per-request log line. Keep that guard when adding logging to a request path, or the test output becomes unreadable.

## Docker image

Four stages. `fetch` installs the full dependency set from the frozen lockfile; `build` adds `tsconfig.json` and `src/` and compiles; `prod` re-runs the install with `--prod` to get a pruned `node_modules`; the final stage assembles `package.json`, the pruned modules and `build/`. Only `package.json`, the two lockfiles, `tsconfig.json` and `src/` ever enter the image, so tests and CI config cannot affect it.

`pino-pretty` is a **runtime** dependency, not a dev one, because `logger.ts` configures it as the transport unconditionally — including in production. Moving it to `devDependencies` breaks the image at startup.

The base image is pinned to an exact patch (`node:24.20.0-trixie-slim`) and bumped by Renovate. The final stage drops to the image's built-in `node` user (uid 1000), and `docker-compose.yml` adds `no-new-privileges`.

A `HEALTHCHECK` polls the app over loopback and passes if **either** route answers 200, because which one is enabled depends on `ROOT_RES`/`ENDPOINT_RES`. It shells out to `node -e` rather than curl, which the slim image does not ship. It assumes the app is reachable on `127.0.0.1`; a custom `HOST` that binds elsewhere will report unhealthy.

## CI

`.github/workflows/docker-publish.yml` (named "CI") builds and tests on every push except the `documentation` branch, then on `master` only, publishes to GHCR tagged `:latest` and `:<sha>`.

`.github/workflows/lint.yml` runs `pnpm lint` on PRs to `main`/`master` and, on failure, comments telling the author to run `pnpm run format`.

`.github/workflows/claude-autofix.yml` is the nightly repair pass: it finds one open pull request whose CI is red and lets Claude attempt a fix, pushing to that pull request's branch. Two crons an hour apart both mean 03:10 Europe/Bratislava, and a local-hour guard in the `select` job discards whichever one DST made wrong — so exactly one run happens per night. `select` costs no Claude tokens, and everything expensive is gated behind its output. It is the one workflow permitted to write to the repository; see the AI policy section below.

That workflow keeps its two long pieces outside the YAML, in the usual place for GitHub Actions helpers: the triage logic is `.github/scripts/select-failing-pr.js`, loaded by `actions/github-script` with `require`, and Claude's instructions are `.github/prompts/claude-autofix.md`. Both are read in the `select` job, which has the **default branch** checked out — `fix` has the pull request's own branch, so building the prompt there would let a pull request rewrite the instructions used to repair it. The prompt file's `{{PR_NUMBER}}` and `{{REPOSITORY}}` placeholders are filled in by a `sed` step, and its HTML comment header is stripped before Claude sees it.

All three workflows and the Dockerfile install pnpm 11, and `package.json` pins `packageManager` to an exact version. Change all five together if you bump it.

## Conventions

Prettier: tabs, single quotes, semicolons, no trailing commas, 100 columns.

**Prettier is scoped away from the vendored skills, and it has to stay that way.** Alongside build output and lockfiles, `.prettierignore` lists `.agents/`, `.claude/skills/` and `skills-lock.json`. Drop any of those three and `prettier --check .` starts walking the forty-odd vendored files the project did not write, and `pnpm lint` fails — that markdown contains annotated samples a formatter should not touch. Add new vendored paths to `.prettierignore` rather than reformatting them.

Agent skills are vendored in `.agents/skills/` and symlinked into `.claude/skills/`, tracked by `skills-lock.json`. **Unlike some setups, `.agents/` is committed here** — both the vendored files and the symlinks are in git. Manage them with the `skills` CLI (`pnpm dlx skills add|remove|list|update ...`) rather than hand-editing the vendored trees or the lock file; `remove <name> -y` deletes the directory, the symlink and the lock entry together.

Open work lives in the **TODO section of `README.md`** — there is no `todo.md`. Remove an entry once it is implemented instead of leaving it as a record of completed work.

Commit subjects have no enforced convention. Renovate produces `Update dependency <x> to v<n> (#<pr>)`; human commits are lowercase free text (`add skills`, `pnpm allow build`). Match the surrounding log rather than importing a scheme from elsewhere.

Licensed MIT.

The README carries an explicit disclaimer that the author is a hobbyist and welcomes issues and PRs. Keep that tone in documentation: plain, unhedged, aimed at someone learning.

## AI policy

`.claude/ai-policy.md` governs AI-assisted work in this repository. Read it before acting; the constraints below are the parts that bind a session here, not a summary of the whole document.

**A human creates the commit.** An AI tool may prepare changes in a supervised local working tree, but the human contributor reviews the complete result, selects what goes in, and commits personally — and must be able to explain every substantive part of it. So: prepare and explain changes, then stop. Do not commit, amend, push, tag, open or merge a pull request, cut a release, or publish a package. That includes the GHCR image this repo publishes.

**The one exception does not apply to a session here.** The policy's "Supervised automation" clause lets `claude-autofix.yml` commit and push to the head branch of an already open pull request, because Renovate opens those branches without human authorship in the first place and the owner still decides whether to merge. It is scoped to that workflow and to that branch. An interactive session in this working tree is still bound by the paragraph above, and the autofix run itself still may not merge, approve, retarget a base branch, push to `master`, or touch a pull request from a fork.

**Do not touch repository settings, branch protections, secrets, or deployments.** Nothing in this repo needs them, and the policy puts them out of scope regardless.

**Never paste secrets into a prompt or a file** — tokens, keys, `.env` contents from a real deployment. Use the placeholder values from `.env.example` when an example is needed.

**Do not invent APIs, dependencies, references, or test results.** The policy lists fabrication as grounds for rejecting a contribution outright, and it names "appears plausible, compiles, or passes automated checks" as insufficient. When a claim about this codebase is uncertain, verify it or say it is unverified.

If AI assistance was material to a change, the policy asks for a short disclosure in the pull request; it gives suggested wording, and exempts trivial help like spelling or formatting.

The document was adapted from another repository and has been reconciled with this one: it now names `MIT` as the project licence, and the clauses about database migrations and location telemetry — neither of which exists here — have been removed.
