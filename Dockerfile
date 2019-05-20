FROM deliveroo/hopper-runner:1.5.2 as hopper-runner
FROM node:10

COPY --from=hopper-runner /hopper-runner /usr/bin/hopper-runner

# Prepare workspace
WORKDIR /lookerbot

# Install Node dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Copy the rest of the app source
COPY . ./

# "Run"
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE $PORT

# Bake in the default run command
ENTRYPOINT ["hopper-runner"]
CMD yarn start
