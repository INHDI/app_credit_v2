###########
# Frontend - Production Dockerfile (Next.js 15 / React 19)
# Multi-stage build: builder (install + build) -> runtime (serve)
###########

# ---- Builder stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (leverage docker layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source
COPY . .

# Build the Next.js app (uses Turbopack per package.json)
RUN npm run build


# ---- Runtime stage ----
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Install only production deps for runtime (next start)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the build output and required assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# Expose the Next.js default port
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "start"]


