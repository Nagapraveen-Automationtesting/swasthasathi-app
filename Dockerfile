#FROM nexuscoe.rjil.ril.com:5115/jioent/health/jio-node-base:14-slim as builder
# TODO: below needs to be changed to node v18.18.0
FROM rhhdevacr.azurecr.io/jioent/health/base/node:18.12.1-alpine as builder
# FROM node:18.18.2-alpine3.18 as builder


WORKDIR /usr/src/app
# TODO: changed REACT_ to VITE_
ARG PROXY_HTTP
ARG PROXY_HTTPS
ARG PROXY_NO
ARG BUILD_ENV
ARG PUBLIC_URL

ENV http_proxy $PROXY_HTTP
ENV https_proxy $PROXY_HTTP
ENV noproxy $PROXY_NO
ENV PUBLIC_URL $PUBLIC_URL

RUN npm cache clean --force
RUN npm config set proxy $PROXY_HTTP
RUN npm config set http-proxy $PROXY_HTTP
RUN npm config set https-proxy $PROXY_HTTP
RUN npm config set noproxy $PROXY_NO


#RUN apt-get --allow-releaseinfo-change update
# RUN apt-get install ca-certificates -y

# ADD devopsartifact.jio.com.crt /usr/local/share/ca-certificates/devopsartifact.jio.com.crt
# RUN chmod 644 /usr/local/share/ca-certificates/devopsartifact.jio.com.crt && update-ca-certificates
ADD devopsartifact.jio.com.crt /usr/local/share/ca-certificates/devopsartifact.jio.com.crt
USER root
RUN apk update && apk add ca-certificates && rm -rf /var/cache/apk/*
RUN update-ca-certificates

RUN npm config set noproxy devopsartifact.jio.com
RUN export NO_PROXY=devopsartifact.jio.com

RUN npm config set strict-ssl false
COPY package.json package-lock.json .npmrc /usr/src/app/
RUN npm ci

ADD . /usr/src/app


RUN npm run-script build

RUN npm config rm noproxy
RUN npm config rm proxy 
RUN npm config rm https-proxy
ENV noproxy ""
ENV http_proxy ""
ENV https_proxy ""
#  TODO: vite build creates dist folder instead of build , change it below

#FROM nexuscoe.rjil.ril.com:5115/jioent/health/jio-nginx:1.21.0-alpine
FROM rhhdevacr.azurecr.io/jioent/health/jio-nginx:v2
ARG NGINX_PATH=/usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html
COPY --from=builder /usr/src/app/dist $NGINX_PATH
EXPOSE 5000
CMD ["nginx", "-g", "daemon off;"]
