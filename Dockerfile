# Stage 1: Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
RUN addgroup -g 1001 gatemate && adduser -D -u 1001 -G gatemate gatemate
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY server/ ./server/
COPY reset-password.js ./
COPY --from=frontend /app/client/dist ./client/dist
COPY .env .env
RUN mkdir -p /app/data && chown -R gatemate:gatemate /app
USER gatemate
VOLUME /app/data
ENV DB_PATH=/app/data/gatebump.db
ENV PORT=3111
EXPOSE 3111
CMD ["node", "server/index.js"]
