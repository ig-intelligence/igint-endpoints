FROM node:6.9.4-alpine

ADD . /app

WORKDIR /app

RUN npm install --production

ENV DEBUG igint-endpoints:*

EXPOSE 3500

ENTRYPOINT ["node", "index.js"]
