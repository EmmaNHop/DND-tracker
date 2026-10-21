FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run db:generate && npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev \
    && npm run db:generate \
    && npm cache clean --force

COPY backend ./backend
COPY --from=build /app/dist/mythic-tracker/browser ./dist/mythic-tracker/browser

USER node
EXPOSE 3000

CMD ["sh", "-c", "npm run db:deploy && npm run start:api"]
