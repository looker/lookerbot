FROM node:6.10.3-alpine

ADD . /app
WORKDIR /app

RUN yarn install

ENTRYPOINT ["yarn", "start"]
