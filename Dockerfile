FROM node:22-alpine
WORKDIR /app
RUN npm install nodemailer
COPY dist/ ./dist/
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
