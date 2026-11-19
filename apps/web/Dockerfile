# syntax=docker/dockerfile:1.10
# 웹(Next.js standalone) 컨테이너 이미지. 레포 루트를 빌드 컨텍스트로 씁니다.
#
#   docker buildx build -f apps/web/Dockerfile \
#     --platform linux/arm64 \
#     --build-arg BUILD_ENV=staging --build-arg DEPLOY_ENV=staging \
#     --build-arg GITHUB_SHA=$(git rev-parse HEAD) --build-arg GITHUB_REF_NAME=$(git branch --show-current) \
#     --secret id=web_env,src=apps/web/.env.local \
#     -t webmemo-web:local .
#
# 서버 시크릿은 BuildKit secret(web_env)으로 빌드 단계에만 마운트합니다. 이미지 레이어에는
# 남지 않고, 런타임 값은 VM의 env_file(infra/oracle/compose.yaml)로 따로 넣습니다.
# BUILD_ENV·NEXT_PUBLIC_*은 빌드 때 번들에 인라인되므로 staging·production 이미지를 따로 빌드합니다.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS builder
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# 의존성 레이어: lockfile이 바뀌지 않으면 캐시를 재사용합니다.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm fetch --frozen-lockfile

COPY . .
# 웹과 웹이 의존하는 워크스페이스 패키지만 설치합니다(앱·확장 의존성 제외).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --offline --filter "@web-memo/web..." --filter "web-memo"

ARG BUILD_ENV=production
ARG DEPLOY_ENV=production
ARG GITHUB_SHA
ARG GITHUB_REF_NAME
ENV BUILD_ENV=${BUILD_ENV} \
    DEPLOY_ENV=${DEPLOY_ENV} \
    GITHUB_SHA=${GITHUB_SHA} \
    GITHUB_REF_NAME=${GITHUB_REF_NAME}

# Next는 apps/web/.env.production.local을 읽습니다. secret이 없으면 빈 파일로 빌드합니다.
# turbo는 strict env 모드라 DEPLOY_ENV·GITHUB_*를 걸러 내므로 loose로 넘깁니다.
RUN --mount=type=secret,id=web_env,required=false \
    --mount=type=secret,id=sentry_auth_token,env=SENTRY_AUTH_TOKEN,required=false \
    if [ -f /run/secrets/web_env ]; then cp /run/secrets/web_env apps/web/.env.production.local; fi \
    && pnpm turbo build --filter=@web-memo/web --env-mode=loose \
    && rm -f apps/web/.env.production.local

FROM node:${NODE_VERSION}-slim AS runner
# /api/version은 force-static이지만 revalidatePath("/", "layout")(로그인 처리)가 부르면 실행 중에 다시 만들어집니다.
# 그때도 같은 커밋을 돌려주도록 빌드 인자를 실행 환경에도 남깁니다(Vercel은 VERCEL_GIT_COMMIT_SHA가 실행 중에도 있음).
ARG GITHUB_SHA
ARG GITHUB_REF_NAME
ENV GITHUB_SHA=${GITHUB_SHA} \
    GITHUB_REF_NAME=${GITHUB_REF_NAME} \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=node:node /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
# /api/version은 빌드 때 굳는 정적 응답이라 헬스체크 비용이 거의 없습니다.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/version').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
