#!/bin/sh
# One-time setup: makes the EC2 server deploy every new push to GitHub `main` by itself.
# Run from Git Bash in the project folder:   sh deploy/aws-ec2/enable-auto-update.sh
# Override defaults with env vars: SERVER_IP, SSH_KEY, SSH_USER, BRANCH.
set -eu
cd "$(dirname "$0")/../.."
IP="${SERVER_IP:-32.200.156.245}"
KEY="${SSH_KEY:-$HOME/Downloads/onequeue.pem}"
USER_="${SSH_USER:-ubuntu}"
BRANCH="${BRANCH:-main}"
SSH="ssh -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o BatchMode=yes"
SCP="scp -i $KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 -o BatchMode=yes -q"

$SCP deploy/aws-ec2/auto-update.sh "$USER_@$IP:/tmp/onequeue-autoupdate"
$SSH "$USER_@$IP" "sudo BRANCH='$BRANCH' bash -s" <<'REMOTE'
set -eu
install -m 755 /tmp/onequeue-autoupdate /usr/local/bin/onequeue-autoupdate && rm -f /tmp/onequeue-autoupdate
install -d -m 755 -o onequeue -g onequeue /var/lib/onequeue-autoupdate
cat > /etc/systemd/system/onequeue-autoupdate.service <<UNIT
[Unit]
Description=Deploy new ONEQUEUE commits from GitHub
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
Environment=BRANCH=$BRANCH
ExecStart=/usr/local/bin/onequeue-autoupdate
Nice=10
TimeoutStartSec=20min
UNIT
cat > /etc/systemd/system/onequeue-autoupdate.timer <<UNIT
[Unit]
Description=Check GitHub for new ONEQUEUE commits every minute

[Timer]
OnBootSec=2min
OnUnitInactiveSec=1min
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now onequeue-autoupdate.timer >/dev/null
echo "Auto-update enabled for branch $BRANCH. Logs: sudo journalctl -u onequeue-autoupdate -f"
REMOTE
