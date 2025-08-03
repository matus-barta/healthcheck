# we base you dockerfile on debian with node preinstalled
FROM node:24.4.1-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

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
RUN pnpm prune --production

# now we prepare the final package with builded files
FROM base
ENV NODE_ENV=production
COPY --from=fetch /app/package.json /app/package.json
COPY --from=prod /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

# start the application
CMD ["pnpm","start"]