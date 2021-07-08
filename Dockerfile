FROM node:lts-alpine

EXPOSE 9835

VOLUME [ "/lnd", "/data" ]

WORKDIR /usr/src/app

RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

ADD ./package.json /usr/src/app/package.json
ADD ./yarn.lock /usr/src/app/yarn.lock

RUN yarn

ADD . /usr/src/app

ENTRYPOINT [ "node", "main.js" ]