# Healthcheck API endpoint for docker

Simple and beginner-friendly docker container with healthcheck endpoint to call.

This code and repo is intended to be simple to understand, so I try include basics how to do things. Intention is to update the code to be much more commented to be easily understandable by beginner.

**Practical use:** I use this to check if [DDNS](https://github.com/timothymiller/cloudflare-ddns) is correctly running and pointing to my homelab. The service is running on docker managed by [Portainer](https://www.portainer.io/) and behind [Nginx Proxy Manager](https://nginxproxymanager.com/). I check if the service is up with [Uptime-Kuma](https://github.com/louislam/uptime-kuma), this way I can see if all parts of the chain are working correctly.

_Personal disclaimer: I am not professional developer. I am just hobbyist, there may be some bugs or update that may cause instability or unexpected behavior and there may be security issues, if you find any please let me know or if you want, make a PR._
_Thank you._

## Usage

- HTTP request to `http://address:port/healthcheck` or `http://address:port/`
- Will return JSON `{"Status" : "OK"}` or plaintext `OK`
- If the endpoint is disabled will return `404` status

## Getting started

### Using Docker

```bash
docker run --name=healthcheck -p 8082:8082 --restart unless-stopped ghcr.io/matus-barta/healthcheck:latest
```

### Using Docker-Compose

```yaml
version: '3.0'
services:
  healthcheck:
    image: ghcr.io/matus-barta/healthcheck:latest
    container_name: healthcheck
    environment:
      - PORT=8082 # listening port
      - HOST="localhost" # listening IP address
      - ROOT_RES="true" # https://<domain>/
      - ENDPOINT_RES="false" # https://<domain>/healthcheck
      - JSON_RES="true" # response in JSON
    ports:
      - 8082:8082
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
```

## Configurable via ENV variables

### Default values

These are the default values. So, there is no need to have them included if you need just defaults.

```bash
PORT=8082            # listening port
HOST="0.0.0.0"       # listening IP address
ROOT_RES="true"      # http://<domain>/
ENDPOINT_RES="false" # http://<domain>/healthcheck
JSON_RES="true"      # response in JSON
```

## Development

_Prerequisites: Installed Node.JS with NPM, docker and Git._

- Download repository `git clone https://github.com/matus-barta/healthcheck`
- Open directory `cd healthcheck`
- Install dependencies with `npm install`
- Start a development server `npm run dev`

### Build and run the docker container

- Open healthcheck directory `cd healthcheck`
- Build docker image `docker build -t healthcheck .`
- Run the builded container `docker run -p 8082:8082 healthcheck`

### Build and run locally

- Run build: `npm run build`
- Run start: `npm run start`

### Testing

- Run tests: `npm run test`

## Nightly autofix

`.github/workflows/claude-autofix.yml` runs once a night and tries to repair one pull request whose
CI is red. It never merges anything. When it manages a fix it pushes to the pull request branch and
leaves the pull request for review; when it cannot, it comments saying what is broken instead.

Most of the pull requests it sees are Renovate's. `renovate.json` merges passing dependency bumps
straight to the branch without opening a pull request at all, so a Renovate pull request that is
still open is a bump that already failed — exactly the thing worth a repair attempt.

The two long parts live next to the workflow rather than inside it: `.github/scripts/select-failing-pr.js`
decides which pull request to pick, and `.github/prompts/claude-autofix.md` is what Claude is asked to do.
Edit those to change its behaviour.

Note that once anything pushes to a Renovate branch, Renovate stops updating it. If you would rather
Renovate start the bump over from scratch, close the pull request and let it be recreated.

### Turning it on

1. Install the [Claude GitHub App](https://github.com/apps/claude) on the repository.
2. Run `claude setup-token` locally and save the result as the repository secret
   `CLAUDE_CODE_OAUTH_TOKEN`. The token bills against that account's Claude subscription.

Without the secret the workflow's triage step still runs and costs nothing; only the repair step
fails.

### Keeping the cost down

The workflow spends the same subscription budget a person does, so it is built to spend as little as
possible:

- The job that looks for a failing pull request makes plain GitHub API calls and uses no Claude
  tokens. On a night with nothing red, that is the entire run.
- At most one pull request per night, one run per night, capped at 15 turns on Sonnet.
- A pull request whose newest commit came from Claude is skipped. If Claude has already tried and CI
  is still failing, it needs a person, not another attempt.
- It runs at 03:10 local time so that the five-hour usage window it opens has expired again before
  the morning.

To try it without spending anything, run it by hand from the Actions tab: `dry_run` defaults to true
and reports which pull request it would have picked.

## Contributing

- Feel free to create pull request with feature or bug.
- If you found any bug or want to suggest feature feel free to create issue.
- If there is something not clear (code or on documentation), also create a issue.

## TODO

- Comment code
- Review documentation and improve
