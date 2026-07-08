FROM node:22-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
# apps/web is excluded from context; provide a stub so pnpm workspace recognizes it
RUN mkdir -p apps/web && echo '{"name":"web","version":"0.0.0","private":true}' > apps/web/package.json
RUN pnpm install --no-frozen-lockfile --ignore-scripts --filter api...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY . .
# Generate Prisma client types before TypeScript compilation
RUN pnpm --filter api exec prisma generate
# Build shared (install tsc globally in this stage only)
RUN npm install -g typescript && cd packages/shared && tsc -p tsconfig.json
# Compile the API
RUN pnpm --filter api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
