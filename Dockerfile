FROM node:4.4

ADD . /app
WORKDIR /app

RUN npm install

ENTRYPOINT ["npm", "start"]
