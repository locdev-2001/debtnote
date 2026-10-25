FROM node:22-bookworm-slim AS application
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.8.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build && mkdir -p /data/uploads && chown -R node:node /data
ENV NODE_ENV=production API_HOST=0.0.0.0 UPLOAD_DIR=/data/uploads
USER node
CMD ["node", "apps/api/dist/main.js"]

FROM nginx:alpine AS web
COPY deploy/nginx-app.conf /etc/nginx/conf.d/default.conf
COPY --from=application /app/apps/web/dist /usr/share/nginx/html
