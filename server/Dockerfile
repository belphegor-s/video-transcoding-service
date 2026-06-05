# ---- Builder ----
FROM node:20-slim AS builder
WORKDIR /app

# Install all deps (incl. dev) for the TypeScript build.
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies for a lean runtime image.
RUN npm prune --omit=dev

# ---- Runtime ----
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 9191
CMD ["node", "dist/index.js"]
