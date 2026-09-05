# we base you dockerfile on debian with node preinstalled
FROM node:24.20.0-trixie-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11

WORKDIR /app

# run pnpm to install packages
FROM base AS fetch
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# build the project
FROM fetch AS build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# prune the non prod packages
FROM fetch AS prod
RUN pnpm install --frozen-lockfile --prod

# now we prepare the final package with builded files
FROM base
ENV NODE_ENV=production
COPY --from=fetch /app/package.json /app/package.json
COPY --from=prod /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

# drop the root privileges the build stages needed; the node image ships this user
USER node

# the point of this image is an endpoint that answers, so check that one actually does.
# either route may be the enabled one depending on ROOT_RES / ENDPOINT_RES, so accept either.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
	CMD node -e "const p=process.env.PORT??8082,get=r=>fetch('http://127.0.0.1:'+p+r).then(x=>x.ok).catch(()=>false);Promise.all([get('/'),get('/healthcheck')]).then(r=>process.exit(r.includes(true)?0:1))"

# start the application
CMD ["node", "build/src/index.js"]