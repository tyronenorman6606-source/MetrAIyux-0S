FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git tini \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY tools/skyevault-git-remote-server.mjs ./tools/skyevault-git-remote-server.mjs
COPY tools/skyevault-git-remote-maintenance.mjs ./tools/skyevault-git-remote-maintenance.mjs
COPY tools/skyevault-ssh-git-shell.mjs ./tools/skyevault-ssh-git-shell.mjs
COPY package.json ./package.json

RUN useradd --system --home-dir /var/lib/skyevault --create-home --shell /usr/sbin/nologin skyevault \
  && mkdir -p /var/lib/skyevault/git-remote /app/.skyevault-out \
  && chown -R skyevault:skyevault /var/lib/skyevault /app/.skyevault-out

USER skyevault
EXPOSE 8787
ENV SKYEVAULT_GIT_REMOTE_HOST=0.0.0.0
ENV SKYEVAULT_GIT_REMOTE_PORT=8787
ENV SKYEVAULT_GIT_REMOTE_ROOT=/var/lib/skyevault/git-remote

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "tools/skyevault-git-remote-server.mjs"]
