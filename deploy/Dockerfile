FROM node:20-slim AS base
ENV CI=true
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app
COPY .husky/ .husky/
COPY prisma/ prisma/
COPY package.json pnpm-lock.yaml /app/
RUN corepack prepare pnpm@9.15.4 --activate
RUN corepack enable
RUN apt-get update -y \
  && apt-get install -y openssl # OpenSSL is required for Prisma to work


FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -D prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm db:generate


FROM base AS build
RUN  --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN  --mount=type=cache,id=pnpm,target=/pnpm/store pnpm db:generate
COPY . /app/
RUN  pnpm run build


FROM base AS prod
EXPOSE 9000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist /app/dist
USER nodejs
CMD  [ "node", "dist/src/client/index.js" ]