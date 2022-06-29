
# Healthcheck API endpoint for docker

Simple and beginner-friendly docker container with healthcheck endpoint to call.

This code and repo is intended to be simple to understand, so I try include basics how to do things. Intention is to update the code to be much more commented to be easily understandable by beginner.

**Practical use:** I use this to check if [DDNS](https://github.com/timothymiller/cloudflare-ddns) is correctly running and pointing to my homelab. The service is running on docker managed by [Portainer](https://www.portainer.io/) and behind [Nginx Proxy Manager](https://nginxproxymanager.com/). I check if the service is up with [Uptime-Kuma](https://github.com/louislam/uptime-kuma), this way I can see if all parts of the chain are working correctly.

*Personal disclaimer: I am not professional developer. I am just hobbyist, there may be some bugs or update that may cause instability or unexpected behavior and there may be security issues, if you find any please let me know or if you want, make a PR.*
*Thank you.*

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
version: "3.0"
services:
  healthcheck:
    image: ghcr.io/matus-barta/healthcheck:latest
    container_name: healthcheck
    environment:
      - PORT=8082            # listening port
      - HOST="localhost"     # listening IP address
      - ROOT_RES="true"      # https://<domain>/
      - ENDPOINT_RES="false" # https://<domain>/healthcheck
      - JSON_RES="true"      # response in JSON
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

*Prerequisites: Installed Node.JS with NPM, docker and Git.*

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
- Run build: `npm run start`

## Contributing

- Feel free to create pull request with feature or bug.
- If you found any bug or want to suggest feature feel free to create issue.
- If there is something not clear (code or on documentation), also create a issue.

## TODO

- Comment code
- Review documentation and improve
