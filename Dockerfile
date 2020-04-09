FROM node:12.13.0-alpine

ADD . /app
WORKDIR /app

RUN yarn install

ENTRYPOINT ["yarn", "start"]

EXPOSE 3333
