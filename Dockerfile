#stage one
FROM node:16.15.1-alpine AS node-build
WORKDIR /usr

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN ls -a
RUN npm install
RUN npm run build

#stage two
FROM node:16.15.1-alpine
WORKDIR /usr

ENV NODE_ENV production

COPY package.json ./
RUN npm install

COPY --from=0 /usr/build/src .
RUN npm install pm2 --location=global

CMD ["pm2-runtime","index.js"]