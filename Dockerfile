FROM node:18

WORKDIR /app

COPY package*.json /app

RUN npm i

COPY . /app

EXPOSE 1776
EXPOSE 1777

VOLUME ["/app/data"]

CMD [ "npm", "start" ]
