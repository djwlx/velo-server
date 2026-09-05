FROM node:24-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build \
  && pnpm prune --prod

FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts

RUN mkdir -p /app/data

VOLUME ["/app/data"]

EXPOSE 3000

CMD ["sh", "-c", "mkdir -p data && pnpm db:migrate && { [ -f data/.env ] && node --env-file=data/.env dist/index.js || node dist/index.js; }"]