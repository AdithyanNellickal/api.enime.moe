FROM node:16.3.0-alpine

RUN mkdir -p /app
WORKDIR /app

COPY package*.json ./app

RUN apk add --no-cache tini

COPY . /app

RUN npm install npm -g
RUN npm install -g vite@2.9.14
RUN npm install -g rimraf
RUN npm install -D --legacy-peer-deps

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PRODUCTION=true
ENV PROD=true

RUN npm install --legacy-peer-deps

RUN npm run build

EXPOSE 3000

COPY /app/dist ./dist

CMD ["node", "dist/main"]


