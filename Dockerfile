FROM node:22-alpine
WORKDIR /app
COPY dist/ ./dist/
EXPOSE 3000
CMD node dist/index.mjs
