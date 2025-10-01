FROM node:18-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

ENV NODE_ENV=production
RUN npm run build

FROM nginx:alpine as production-stage

COPY nginx-no-cache.conf /etc/nginx/nginx.conf

COPY --from=build-stage /app/dist /usr/share/nginx/html

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set proper ownership and permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    mkdir -p /tmp /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx:nginx /tmp /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 755 /tmp /var/cache/nginx /var/run /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx && \
    chmod -R 755 /etc/nginx

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

RUN apk add --no-cache curl

CMD ["nginx", "-g", "daemon off;"]

