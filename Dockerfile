FROM node:22.13.1-bookworm-slim AS dependencies

WORKDIR /app

RUN apt-get update && \
    apt-get install --yes --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@10.13.1
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS source
COPY nest-cli.json tsconfig.json tsconfig.build.json eslint.config.mjs ./
COPY apps ./apps
COPY libs ./libs
RUN NODE_ENV=production PRISMA_DB_URL=postgresql://user:password@localhost:5432/placeholder pnpm prisma:generate

FROM source AS gateway-build
RUN pnpm exec nest build main-gateway-service

FROM source AS file-build
RUN pnpm exec nest build micro-file-service

FROM source AS post-build
RUN pnpm exec nest build micro-post-service

FROM dependencies AS production-dependencies
RUN pnpm prune --prod

FROM node:22.13.1-bookworm-slim AS runtime
ENV NODE_ENV=production
LABEL org.opencontainers.image.vendor="dzencode"
WORKDIR /app
RUN apt-get update && \
    apt-get install --yes --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=source --chown=node:node /app/package.json ./package.json
COPY --from=source --chown=node:node /app/libs/contracts/src/proto ./libs/contracts/src/proto
COPY --from=source --chown=node:node /app/apps/main-gateway-service/prisma/generated ./apps/main-gateway-service/prisma/generated
COPY --from=source --chown=node:node /app/apps/micro-file-service/prisma/generated ./apps/micro-file-service/prisma/generated
COPY --from=source --chown=node:node /app/apps/micro-post-service/prisma/generated ./apps/micro-post-service/prisma/generated
USER node

FROM runtime AS gateway
COPY --from=gateway-build --chown=node:node /app/dist/apps/main-gateway-service ./dist/apps/main-gateway-service
EXPOSE 3000
CMD ["node", "dist/apps/main-gateway-service/apps/main-gateway-service/src/main.js"]

FROM runtime AS file-service
COPY --from=file-build --chown=node:node /app/dist/apps/micro-file-service ./dist/apps/micro-file-service
EXPOSE 50052
CMD ["node", "dist/apps/micro-file-service/apps/micro-file-service/src/main.js"]

FROM runtime AS post-service
COPY --from=post-build --chown=node:node /app/dist/apps/micro-post-service ./dist/apps/micro-post-service
EXPOSE 50053
CMD ["node", "dist/apps/micro-post-service/apps/micro-post-service/src/main.js"]

FROM source AS migrations
LABEL org.opencontainers.image.vendor="dzencode"
USER node
CMD ["pnpm", "prisma:migrate:deploy:gateway"]
