FROM node:22-alpine

RUN apk add --no-cache bash curl postgresql-client openssl coreutils

WORKDIR /workspace
COPY runner.mjs /app/runner.mjs

CMD ["node", "/app/runner.mjs"]
