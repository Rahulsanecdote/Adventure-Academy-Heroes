# KidQuest game server (Phase 2 multiplayer)
# Build from the REPO ROOT (the image also copies the canonical phrase list
# out of the frontend tree — single source of truth, see docs/MULTIPLAYER.md):
#   docker build -t kidquest-game-server -f game-server/Dockerfile .
FROM node:20-alpine AS build
WORKDIR /app
COPY game-server/package.json game-server/package-lock.json* ./
RUN npm install
COPY game-server/tsconfig.json ./
COPY game-server/src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY game-server/package.json game-server/package-lock.json* ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# Canonical phrase allowlist (same file the frontend bundles)
COPY frontend/src/game/net/phrases.json ./phrases.json
ENV PHRASES_PATH=/app/phrases.json
EXPOSE 2567
CMD ["node", "dist/index.js"]
