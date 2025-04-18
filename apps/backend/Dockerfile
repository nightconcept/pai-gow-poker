FROM node:22-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 8080

CMD ["pnpm", "start"]