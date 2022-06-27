
# Healthcheck for docker

"Simple" docker container with healthcheck endpoint to call.

# Usage

- HTTP request to `address:port/healthcheck` or `address:port`
- Will return JSON `{Status : OK}` or plaintext `OK`

# Configurable via ENV variables

#### Defaults

```bash
PORT=82
HOST="localhost"
ROOT_RES="false"
ENDPOINT_RES="true"
JSON_RES="true"
```

*TODO: More description for ENV variables*

## Developing

- Install dependencies with `npm install`
- Start a development server `npm run dev`

## Building

- Run build: `npm run build`
