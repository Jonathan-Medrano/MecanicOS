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
# Generate Prisma client before TypeScript compilation
RUN pnpm --filter api exec prisma generate
# Build shared (tsc pinned to match workspace devDep)
RUN npm install -g typescript@5.6.3 && cd packages/shared && tsc -p tsconfig.json
# Compile the API
RUN pnpm --filter api build
# Flatten pnpm symlinks into a self-contained deployment folder
RUN pnpm --filter api deploy --prod --legacy /standalone
# Re-generate Prisma client inside standalone (postinstall ran without schema during deploy)
RUN cd /standalone && node_modules/.bin/prisma generate --schema=prisma/schema.prisma

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# /standalone has resolved node_modules (no pnpm symlinks), dist/, and prisma/
COPY --from=builder /standalone ./
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
