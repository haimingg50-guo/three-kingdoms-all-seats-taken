FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=4317
ENV DATABASE_PATH=/data/tianxia.sqlite
EXPOSE 4317
CMD ["npm", "run", "start"]
