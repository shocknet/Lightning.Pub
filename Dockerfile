FROM node:14-buster-slim

EXPOSE 9835

VOLUME [ "/root/.lnd", "/data" ]
RUN apt-get update && apt-get install -y apt-transport-https git

WORKDIR /app


ADD ./package.json /app/package.json
ADD ./yarn.lock /app/yarn.lock

RUN yarn

ADD . /app

ENTRYPOINT [ "node", "main.js" ]
