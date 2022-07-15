FROM node:16.15.1-alpine As development

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=development

COPY . .

RUN npm run build

FROM node:16.15.1-alpine As production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PRODUCTION=true
ENV PROD=true

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --only=production

COPY . .

COPY --from=development /usr/src/app/dist ./dist

CMD ["node", "dist/main"]


