#!/usr/bin/env bash
set -euo pipefail

HOST="${JINGJING_HOST:-47.103.122.202}"
USER="${JINGJING_USER:-admin}"
APP_DIR="${JINGJING_APP_DIR:-/opt/jingjing}"

ssh "${USER}@${HOST}" "cd ${APP_DIR} && \
  cp .env /tmp/jingjing-env-backup && \
  git fetch origin main && \
  git reset --hard origin/main && \
  npm install --omit=dev && \
  set -a && . ./.env && set +a && \
  pm2 restart jingjing --update-env || pm2 start server.js --name jingjing && \
  pm2 save && \
  curl -s http://127.0.0.1:4174/api/health"

curl -s "http://${HOST}/api/health"
