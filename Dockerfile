# stage one
# we base you dockerfile on alpine linux with node preinstalled
FROM node:20.12.1-alpine AS node-build

# set our work directory
WORKDIR /usr

# copy package.json tsconfig.json and all the source files
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

# run npm to install packages and build the project
RUN ls -a
RUN npm install
RUN npm run build

# stage two
# again we base the package on alpine linux with node
FROM node:20.12.1-alpine
WORKDIR /usr

# set environment variable that we are in production
ENV NODE_ENV production

# now we have builded the project so we copy only package.json and install them
COPY package.json ./
RUN npm install

# we copy the builded source files only and install pm2 package globally
# pm2 (production manager) will let out app run indefinitely (and som other stuff)
COPY --from=0 /usr/build/src .
RUN npm install pm2 --location=global

# start the application
CMD ["pm2-runtime","index.js"]