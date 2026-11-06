#!/bin/bash
# Runs ON the EC2 server every minute (onequeue-autoupdate.timer).
# If GitHub has a new commit on $BRANCH, it builds and tests that commit, swaps it into
# /opt/onequeue, restarts the app, and rolls back if the health check fails.
# Never touches /opt/onequeue/.env.production. Database migrations are NOT run here.
# Logs: sudo journalctl -u onequeue-autoupdate -n 100
set -euo pipefail
REPO="${REPO:-https://github.com/wemji/itp2.git}"
BRANCH="${BRANCH:-main}"
APP=/opt/onequeue
STATE=/var/lib/onequeue-autoupdate
SRC="$STATE/src"
export npm_config_cache="$STATE/npm-cache" npm_config_update_notifier=false
exec 9>"$STATE/lock"; flock -n 9 || exit 0

as_builder() { runuser -u onequeue -- env HOME="$STATE" npm_config_cache="$npm_config_cache" "$@"; }

latest="$(git ls-remote "$REPO" "refs/heads/$BRANCH" | cut -f1)"
[ -n "$latest" ] || { echo "Could not read $BRANCH from $REPO"; exit 1; }
[ "$latest" = "$(cat "$STATE/deployed" 2>/dev/null)" ] && exit 0
[ "$latest" = "$(cat "$STATE/failed" 2>/dev/null)" ] && exit 0
echo "==> New commit on $BRANCH: $latest"

fail() { echo "!! $1 - keeping the current version live"; echo "$latest" > "$STATE/failed"; exit 1; }

# Fetch the commit into a persistent checkout (keeps node_modules between runs)
[ -d "$SRC/.git" ] || as_builder git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$SRC"
as_builder git -C "$SRC" fetch --quiet --depth 1 origin "$BRANCH"
as_builder git -C "$SRC" reset --quiet --hard "$latest"
as_builder git -C "$SRC" clean --quiet -fd

cd "$SRC"
lock_hash="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [ "$lock_hash" != "$(cat "$STATE/lock-hash" 2>/dev/null)" ] || [ ! -d node_modules ]; then
  echo "==> Installing dependencies"
  as_builder npm ci --include=dev --no-audit --no-fund --loglevel=error || fail "npm ci failed"
  echo "$lock_hash" > "$STATE/lock-hash"
fi
echo "==> Testing"
as_builder npm test --workspace server --silent || fail "Server tests failed"
echo "==> Building the client"
as_builder env VITE_API_URL=/api VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build --silent || fail "Client build failed"

echo "==> Swapping in the new version"
rm -rf "$STATE/previous"; mkdir -p "$STATE/previous"
cp -a "$APP/package.json" "$APP/package-lock.json" "$APP/client" "$APP/server" "$STATE/previous/"
swap_in() { # $1 = directory holding package.json, package-lock.json, client/, server/
  rm -rf "$APP/client" "$APP/server"
  mkdir -p "$APP/client"
  cp -a "$1/package.json" "$1/package-lock.json" "$APP/"
  cp -a "$1/client/package.json" "$1/client/dist" "$APP/client/"
  cp -a "$1/server" "$APP/server"
  rm -rf "$APP/server/node_modules" "$APP/server/test"
  (cd "$APP" && npm ci --omit=dev --workspace server --include-workspace-root --no-audit --no-fund --loglevel=error)
  chown -R onequeue:onequeue "$APP"
  chown root:onequeue "$APP/.env.production" && chmod 640 "$APP/.env.production"
  systemctl restart onequeue
}
healthy() { for _ in $(seq 1 20); do curl -fsS -o /dev/null http://127.0.0.1:8080/api/health && return 0; sleep 2; done; return 1; }

swap_in "$SRC"
if healthy; then
  echo "$latest" > "$STATE/deployed"; rm -f "$STATE/failed"
  echo "==> Live: $latest"
else
  echo "!! New version failed its health check - rolling back"
  swap_in "$STATE/previous"
  healthy && echo "==> Rolled back to the previous version" || echo "!! Rollback is unhealthy too - check: journalctl -u onequeue"
  echo "$latest" > "$STATE/failed"; exit 1
fi
