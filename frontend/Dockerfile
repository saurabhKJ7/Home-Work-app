# syntax=docker/dockerfile:1

# 1) Build stage
FROM node:20-alpine AS build
WORKDIR /app/frontend

# Enable corepack just in case; use npm since project ships package-lock
RUN corepack enable || true

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite honors VITE_* env vars at build time. Render can pass env vars; we default to "/api" if not provided.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build


# 2) Runtime stage (serve static files)
FROM nginx:alpine AS runtime

# Copy build output
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy nginx template and start script
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Use envsubst to inject PORT and BACKEND_URL at runtime, then start nginx
ENV PORT=10000
ENV BACKEND_URL=

EXPOSE 10000
CMD sh -c 'envsubst "\$PORT\$BACKEND_URL" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'


