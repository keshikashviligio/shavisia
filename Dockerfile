FROM node:24-alpine
WORKDIR /app

# schema + config first so postinstall (prisma generate) works during npm ci
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .

# build never touches the DB (all DB routes are dynamic) — dummy URL for config load
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# apply pending migrations, then serve
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
