FROM node:22-slim

WORKDIR /app

# Install pnpm via corepack (avoids npm preinstall hook)
RUN corepack enable && corepack prepare pnpm@10 --activate

COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY .npmrc ./

COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod
COPY lib/api-spec ./lib/api-spec
COPY lib/api-client-react ./lib/api-client-react
COPY lib/integrations-openai-ai-server ./lib/integrations-openai-ai-server
COPY artifacts/api-server ./artifacts/api-server
COPY scripts ./scripts

RUN pnpm install --no-frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

ENV PORT=8080
ENV NODE_ENV=production

CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
