FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

# OpenSSL is required for Prisma to work
RUN apt-get update -y && apt-get install -y openssl

# Set the CI environment variable to make the build stage omit husky hooks
ENV CI=true

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm db:generate
RUN pnpm run build

FROM base
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
# Note: The index file here (
# /app/node_modules/@prisma/client  
# ) imports .prisma/client - which is not present in the node_modules
# COPY --from=build /app/node_modules/@prisma/client /app/node_modules/@prisma/client

# Note: The COPY command above incomplete, for now we will install prisma
# in the final image, run the db:generate command and then ~~remove it again~~
# Edit: Yeah no, removing prisma breaks it - even though the generated client is still there
RUN pnpm i -D prisma
RUN pnpm db:generate

EXPOSE 9000
CMD [ "pnpm", "start" ]