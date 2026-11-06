#!/bin/bash
# Runs ON the EC2 server (Ubuntu). Installs Node.js 22 + Caddy and runs ONEQUEUE as a service.
# Usage: sudo bash remote-setup.sh <public-hostname>
# Expects /tmp/onequeue.tar.gz and /tmp/onequeue.env (uploaded by deploy.sh).
set -euo pipefail
HOST="$1"
APP=/opt/onequeue
export DEBIAN_FRONTEND=noninteractive

# 1 GB swap so npm installs don't run out of memory on a t3.micro
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node.js 22 and Caddy (free automatic HTTPS) from Ubuntu's repositories
if ! command -v node >/dev/null || ! command -v caddy >/dev/null; then
  apt-get update -qq
  apt-get install -y -qq nodejs npm caddy >/dev/null
fi

# App files
id onequeue >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin onequeue
mkdir -p "$APP"
find "$APP" -mindepth 1 -maxdepth 1 ! -name .env.production ! -name node_modules -exec rm -rf {} +
tar -xzf /tmp/onequeue.tar.gz -C "$APP"
if [ -f /tmp/onequeue.env ]; then install -m 600 -o root -g root /tmp/onequeue.env "$APP/.env.production"; rm -f /tmp/onequeue.env; fi
cd "$APP"
npm ci --omit=dev --workspace server --include-workspace-root --no-audit --no-fund --loglevel=error
chown -R onequeue:onequeue "$APP"
chown root:onequeue "$APP/.env.production" && chmod 640 "$APP/.env.production"

# Read-only database viewer: `sudo onequeue-db [table]`
if [ -f /tmp/onequeue-db.mjs ]; then
  install -m 644 /tmp/onequeue-db.mjs "$APP/onequeue-db.mjs" && rm -f /tmp/onequeue-db.mjs
  printf '#!/bin/sh\nset -a; . %s/.env.production; set +a\nexec /usr/bin/node %s/onequeue-db.mjs "$@"\n' "$APP" "$APP" > /usr/local/bin/onequeue-db
  chmod 755 /usr/local/bin/onequeue-db
fi

cat > /etc/systemd/system/onequeue.service <<UNIT
[Unit]
Description=ONEQUEUE web app
After=network-online.target
Wants=network-online.target

[Service]
User=onequeue
WorkingDirectory=$APP
EnvironmentFile=$APP/.env.production
Environment=NODE_ENV=production PORT=8080
ExecStart=/usr/bin/node server/src/index.js
Restart=always
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
UNIT

# Free certificates are only issued for names, so the bare IP just redirects to the sslip.io name.
IP="$(echo "${HOST%%.sslip.io}" | tr - .)"
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
  encode gzip
  reverse_proxy 127.0.0.1:8080
}

http://$IP {
  redir https://$HOST{uri} 302
}
CADDY

systemctl daemon-reload
systemctl enable caddy onequeue >/dev/null 2>&1
systemctl restart caddy

if grep -qE '^SUPABASE_URL=https://[a-z0-9]+\.supabase\.co' "$APP/.env.production"; then
  # Real keys are present: drop the temporary preview override and run in full production mode.
  rm -rf /etc/systemd/system/onequeue.service.d/preview.conf && systemctl daemon-reload
  systemctl restart onequeue
  for i in $(seq 1 15); do curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1 && break; sleep 1; done
  curl -fsS http://127.0.0.1:8080/api/health && echo "  <- app healthy"
else
  systemctl stop onequeue
  echo "Server is ready, but the app was NOT started: add real Supabase keys and run deploy.sh again."
fi
