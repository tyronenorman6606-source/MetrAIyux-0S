FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

ENV NODE_ENV=production
ENV PORT=4199
ENV HOST=0.0.0.0

EXPOSE 4199

CMD ["node", "server.mjs"]
