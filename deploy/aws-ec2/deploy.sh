#!/bin/sh
# Deploys ONEQUEUE to the existing EC2 server (Ubuntu, t3.micro, us-east-1) with free HTTPS via Caddy + sslip.io.
# Run from Git Bash in the project folder:   sh deploy/aws-ec2/deploy.sh
# Override defaults with env vars: SERVER_IP, SSH_KEY, SSH_USER.
set -eu
cd "$(dirname "$0")/../.."
IP="${SERVER_IP:-32.200.156.245}"
KEY="${SSH_KEY:-$HOME/Downloads/onequeue.pem}"
USER_="${SSH_USER:-ubuntu}"
HOST="$(echo "$IP" | tr . -).sslip.io"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o BatchMode=yes"
SCP="scp -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o BatchMode=yes -q"

echo "==> Building the client"
# Same-origin API in production; Supabase URL/key come from the server's /runtime-config.json.
MSYS_NO_PATHCONV=1 VITE_API_URL=/api VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build --silent

echo "==> Packaging"
tar -czf "$WORK/onequeue.tar.gz" package.json package-lock.json client/package.json client/dist server/package.json server/src
{
  grep -E '^(SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|NOTIFICATION_FROM)=' server/.env || true
  echo "CLIENT_ORIGIN=https://$HOST"
} > "$WORK/onequeue.env"
if ! grep -qE '^SUPABASE_URL=https://[a-z0-9]+\.supabase\.co' "$WORK/onequeue.env"; then
  echo "    (server/.env has no real Supabase keys yet - keeping any keys already on the server)"
  rm -f "$WORK/onequeue.env"
fi

echo "==> Uploading to $USER_@$IP"
$SCP "$WORK"/onequeue.* deploy/aws-ec2/remote-setup.sh "$USER_@$IP:/tmp/"
echo "==> Configuring the server"
$SSH "$USER_@$IP" "sudo touch /opt/onequeue/.env.production 2>/dev/null || sudo mkdir -p /opt/onequeue && sudo touch /opt/onequeue/.env.production; sudo bash /tmp/remote-setup.sh $HOST"

echo
echo "ONEQUEUE: https://$HOST"
echo "In Supabase > Authentication > URL Configuration, set Site URL to https://$HOST"
echo "and add https://$HOST/reset-password to the Redirect URLs."
