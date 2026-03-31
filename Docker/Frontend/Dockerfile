# Stage 1 : build React/Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copie package.json si present, sinon npm install installera les deps
COPY package*.json ./

RUN npm install

COPY . .
RUN npm run build

# Stage 2 : Nginx Alpine  sert les fichiers statiques
FROM nginx:alpine

RUN rm -f /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chown -R nginx:nginx /var/cache/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
