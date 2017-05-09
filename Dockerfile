FROM node:6.10.3

ADD . /app
WORKDIR /app

RUN yarn install

ENTRYPOINT ["yarn", "start"]
