FROM node:18-alpine AS development

RUN apk update
RUN apk add --no-cache tini

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global \
    PATH=$PATH:/home/node/.npm-global/bin:/home/node/node_modules/.bin:$PATH

RUN mkdir -p /usr/src/app/node_modules
RUN chown -R node:node /usr/src/app

USER node

WORKDIR /usr/src/app

COPY package*.json ./
COPY pnpm-lock*.yaml ./
COPY .swcrc ./
COPY prisma ./prisma/

RUN npm i -g @swc/cli @swc/core @swc/register prisma
RUN npm i -g rimraf
RUN npm i --legacy-peer-deps

COPY . .

RUN npm run build
RUN npm run prisma:generate

FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PRODUCTION=true
ENV PROD=true

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production --legacy-peer-deps

COPY . .

COPY --from=development /usr/src/app/dist ./dist
COPY --from=development /usr/src/app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "dist/main"]