FROM oven/bun:latest

WORKDIR /app

RUN apt-get update && \
    apt-get install -y fontconfig fonts-liberation && \
    fc-cache -f -v

COPY package*.json ./
COPY bun.lock ./

RUN bun install

COPY lib/ ./lib/
COPY src/ ./src/
COPY .env ./

COPY tsconfig.json ./
COPY eslint.config.mjs ./
COPY .prettierrc ./

EXPOSE 3000

CMD ["bun", "."]