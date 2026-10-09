# One image for everything on TrueFoundry (CLAUDE.md section 4):
#   site (Service):        default command → next start on port 3000
#   release (one-off Job): npm run release        (payload migrate, then load-jobs)
#   first admin (one-off): npm run create-admin   (ADMIN_EMAIL + ADMIN_PASSWORD env vars)
#   nightly sync (Job):    npm run sync
# No secrets are baked in: every setting comes from environment variables at run time.
# Build:  docker build -t finance-community .
# (TrueFoundry runs on linux/amd64; on an Apple-silicon Mac add --platform linux/amd64.)

FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# 1. All packages (incl. dev tools needed to build: TypeScript, Tailwind)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build the site
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && rm -rf .next/cache

# 3. Only the packages needed at run time
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 4. Final image: source (scripts, data/, migrations, configs) + run-time packages + the build
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/next-env.d.ts ./next-env.d.ts
USER node
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
