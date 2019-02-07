FROM upsidetravel-docker.jfrog.io/node-upside:10
ENV TS_NODE_FILES true
CMD [ "./node_modules/.bin/ts-node", "./src/index.ts" ]
