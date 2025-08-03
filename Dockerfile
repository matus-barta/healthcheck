# we base you dockerfile on debian with node preinstalled
FROM node:24.4.0-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# set our work directory
WORKDIR /app

# run pnpm to install packages
FROM base AS build
COPY pnpm-lock.yaml /app
RUN pnpm fetch
# copy all the source files
COPY . /app
# build the project
RUN pnpm run build

# get the prod packages
FROM base AS prod
COPY pnpm-lock.yaml /app
RUN pnpm fetch --prod

# now we prepare the final package with builded files
FROM base
COPY --from=prod /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

# set environment variable that we are in production
ENV NODE_ENV=production
# start the application
CMD ["pnpm","start"]