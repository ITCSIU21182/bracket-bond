# Bracket Bond frontend (Next.js, in app/) — built for Railway from the repo root.
#
# The repo root also contains the Anchor/Rust program, so Railway's auto-detection
# picks Rust and fails ("no start command"). This Dockerfile makes Railway build the
# Next.js app instead. (Alternative: set the Railway service Root Directory to `app`
# and this file is ignored — see docs/DEPLOY.md.)

FROM node:20-slim

RUN npm install -g pnpm@10

WORKDIR /app

# Install dependencies first (better layer caching).
COPY app/package.json app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build the app.
COPY app/ ./
RUN pnpm build

ENV NODE_ENV=production
# Railway sets $PORT; `next start` binds it automatically.
CMD ["pnpm", "start"]
