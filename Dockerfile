#stage one
FROM node:lts-alpine
WORKDIR /usr

COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

RUN ls -a
RUN npm install
RUN npm run build

#stage two
FROM node:lts-alpine
WORKDIR /usr

COPY package.json ./
RUN npm install --only=production

COPY --from=0 /usr/build/src .
RUN npm install pm2 -g

CMD ["pm2-runtime","index.js"]