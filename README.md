
# Healthcheck endpoint for docker

Simple docker container with healthcheck endpoint to call.

## Usage

- HTTP request to `http://address:port/healthcheck` or `http://address:port/`
- Will return JSON `{"Status" : "OK"}` or plaintext `OK`
- If the endpoint is disabled will return status `404`

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

### Defaults

These are the default values so there is no need to be included

```bash
PORT=8082            # listening port
HOST="0.0.0.0"       # listening IP address
ROOT_RES="true"      # http://<domain>/
ENDPOINT_RES="false" # http://<domain>/healthcheck
JSON_RES="true"      # response in JSON
```

## Development

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
