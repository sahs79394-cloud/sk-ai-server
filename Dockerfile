FROM node:22-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace config first
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.base.json .npmrc ./

# Copy only what's needed for the api-server
COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod
COPY lib/api-spec ./lib/api-spec
COPY lib/api-client-react ./lib/api-client-react
COPY lib/integrations-openai-ai-server ./lib/integrations-openai-ai-server
COPY artifacts/api-server ./artifacts/api-server
COPY scripts ./scripts

# Install deps (ignore preinstall script that blocks npm)
RUN pnpm install --no-frozen-lockfile

# Build the server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
