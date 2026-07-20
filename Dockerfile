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

# NEXT_PUBLIC_* must exist at build time for Next.js to inline them. Declare them
# as build args (Railway passes service variables as build args) with sane defaults
# so /live reads the real devnet market even without any dashboard config.
ARG NEXT_PUBLIC_MARKET_ID=777
ARG NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
ARG NEXT_PUBLIC_PROGRAM_ID=EbYmsXdALmF4GHY5JQT2Rv5fqC2Nws2qFcnh4B1QXE3U
ENV NEXT_PUBLIC_MARKET_ID=$NEXT_PUBLIC_MARKET_ID \
    NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL \
    NEXT_PUBLIC_PROGRAM_ID=$NEXT_PUBLIC_PROGRAM_ID

# Build the app.
COPY app/ ./
RUN pnpm build

ENV NODE_ENV=production
# Railway sets $PORT; `next start` binds it automatically.
CMD ["pnpm", "start"]
