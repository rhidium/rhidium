FROM node:23-slim AS base
ENV CI=true
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app
COPY .husky/ .husky/
COPY prisma/ prisma/
COPY package.json pnpm-lock.yaml /app/
RUN corepack prepare pnpm@9.15.4 --activate \
  && corepack enable \
  && apt-get update -y \
  && apt-get install -y openssl

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install -D prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm db:generate

# 
# START Client
# 

FROM base AS build-client
RUN  --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN  --mount=type=cache,id=pnpm,target=/pnpm/store pnpm db:generate
COPY . /app/
RUN  pnpm run build

FROM base AS client
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build-client /app/dist /app/dist
CMD  [ "node", "dist/src/core/index.js" ]

# 
# START Docs
# 

FROM base AS build-docs
EXPOSE 9000
COPY --from=build-client /app/node_modules /app/node_modules
COPY typedoc.json tsconfig.json README.md /app/
COPY src /app/src
COPY locales /app/locales
COPY config/config.example.json /app/config/config.json
COPY config/extended-config.example.json /app/config/extended-config.json
RUN pnpm run docs:build

FROM nginx:1.27.4-alpine-slim AS docs
RUN rm -rf /usr/share/nginx/html/*
COPY typedoc.conf /etc/nginx/nginx.conf
COPY --from=build-docs /app/docs /usr/share/nginx/html
EXPOSE 80