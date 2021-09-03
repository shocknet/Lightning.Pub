FROM node:14-buster-slim

EXPOSE 9835

VOLUME [ "/home/shocknet/.lnd", "/data" ]
RUN apt-get update && apt-get install -y apt-transport-https git
RUN useradd -ms /bin/bash shocknet
USER shocknet
WORKDIR /home/shocknet/app


ADD ./package.json /home/shocknet/app/package.json
ADD ./yarn.lock /home/shocknet/app/yarn.lock

RUN yarn

ADD . /home/shocknet/app

ENTRYPOINT [ "node", "main.js" ]
