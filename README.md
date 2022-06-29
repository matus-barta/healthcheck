
# Healthcheck for docker

Simple docker container with healthcheck endpoint to call.

## Usage

- HTTP request to `address:port/healthcheck` or `address:port/`
- Will return JSON `{"Status" : "OK"}` or plaintext `OK`
- If the endpoint is disabled will return status `404`

## Getting started

### Docker

```bash
docker run --name=healthcheck -p 8082:8082 --restart unless-stopped ghcr.io/matus-barta/healthcheck:latest
```

## Configurable via ENV variables

### Defaults

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
