# syntax=docker/dockerfile:1.10
# API(NestJS) 컨테이너 이미지. 레포 루트를 빌드 컨텍스트로 씁니다.
#
#   docker buildx build -f apps/api/Dockerfile --platform linux/arm64 -t webmemo-api:local .
#
# builder는 빌드만, prod-deps는 운영 의존성 설치만 하고, runner에는 dist와 운영 의존성만 옮깁니다(개발 의존성·소스 제외).

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0
RUN corepack enable
WORKDIR /repo

# 의존성 레이어: lockfile이 바뀌지 않으면 캐시를 재사용합니다.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile
COPY . .

FROM base AS builder
# --offline을 쓰지 않습니다. store는 캐시 마운트라 CI(GHA 레이어 캐시)에서는 비어 있을 수 있는데, 그때 위 fetch 레이어는
# 캐시로 건너뛰어 다시 채워지지 않습니다. 없는 패키지만 레지스트리에서 받고, 버전은 --frozen-lockfile이 고정합니다.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@web-memo/api"
RUN pnpm -F @web-memo/api build

# 운영 의존성만 lockfile 그대로 설치합니다. pnpm은 루트 node_modules/.pnpm에 실체를 두고
# apps/api/node_modules에 링크를 걸므로 두 폴더를 같은 상대 위치로 옮겨야 합니다.
# pnpm fetch는 레포 전체 패키지를 node_modules/.pnpm에 펼쳐 두고, --prod 설치는 그것을 지우지 않습니다.
# 그대로 옮기면 앱·확장 의존성까지 실려 이미지가 2GB가 되므로 node_modules를 지우고 store에서 api 것만 다시 깝니다.
# --ignore-scripts: 루트 prepare(husky)는 개발 의존성이라 여기 없습니다. 운영 의존성에는 설치 스크립트가 필요한 패키지가 없습니다.
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    rm -rf node_modules \
    && pnpm install --frozen-lockfile --prod --ignore-scripts --filter "@web-memo/api" \
    # @prisma/client의 peer로 Prisma CLI(prisma)가 딸려 오고, CLI가 Studio·내장 Postgres(pglite)·TypeScript까지 끌어옵니다.
    # 실행에는 생성된 클라이언트(dist/generated)와 @prisma/client 런타임만 쓰므로 CLI 쪽은 지웁니다(약 190MB).
    && cd node_modules/.pnpm \
    && rm -rf prisma@* @prisma+studio-core@* @prisma+dev@* @electric-sql+pglite* typescript@* effect@*

FROM node:${NODE_VERSION}-slim AS runner
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app

COPY --from=prod-deps --chown=node:node /repo/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=node:node /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /repo/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
