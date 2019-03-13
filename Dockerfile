FROM node:10.15.3-alpine

MAINTAINER Cryptoeconomics Lab <https://www.cryptoeconomicslab.com>

ENV DB_BASEPATH=/var/plasmadb
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

RUN apk update && apk add python make g++
USER node
RUN npm install @layer2/operator -g

ENTRYPOINT ["/home/node/.npm-global/bin/layer2-operator"]
