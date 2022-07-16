FROM node:16.3.0-alpine

RUN apk update
RUN apk add --no-cache tini
RUN apk add curl

RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global \
    PATH=$PATH:/home/node/.npm-global/bin:/home/node/node_modules/.bin:$PATH

RUN mkdir -p /usr/src/app/node_modules
RUN chown -R node:node /usr/src/app

USER node

WORKDIR /usr/src/app

COPY package*.json .
COPY pnpm-lock*.yaml .

RUN ls -ld $(find .)

RUN exec sh &&\
pnpm add -g vite@2.9.14 &&\
pnpm add -g rimraf &&\
pnpm install \

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PRODUCTION=true
ENV PROD=true

COPY . .

RUN exec sh && pnpm run build

EXPOSE 3000

CMD ["node", "dist/main"]