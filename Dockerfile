FROM node:12.18.0-alpine3.9

WORKDIR /usr/src/app


ADD ./package.json /usr/src/app/package.json
ADD ./yarn.lock /usr/src/app/yarn.lock
#RUN useradd app && \
#    mkdir -p /home/app/.lnd
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN yarn install

ADD . /usr/src/app
RUN ls /usr/src/app

RUN chmod +x ./docker-start.sh
#ADD ./tls.cert /usr/src/app/tls.cert
#ADD ./admin.macaroon /usr/src/app/admin.macaroon

# && \
#    chown -R app:app /home/app && \
#    chown -R app:app /usr/src/app && \
#    chown -R app:app /start.sh

#ARG lnd_address
#ENV LND_ADDR=$lnd_address
EXPOSE 9835
CMD ["./docker-start.sh"]