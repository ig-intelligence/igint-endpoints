FROM node:6.9.4-alpine

RUN apk add --no-cache libc6-compat

ADD . /app

WORKDIR /app

RUN npm install --production

ENV DEBUG igint-endpoints:*

EXPOSE 3500

ENTRYPOINT ["node", "index.js"]
