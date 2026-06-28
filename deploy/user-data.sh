#!/usr/bin/env bash
# EC2 user-data — paste this when launching the instance (Ubuntu 22.04/24.04).
# Production runs on t3.small (2 GiB); t3.micro also works for a minimal deploy.
# Installs Docker + Compose, 2 GB swap, and git. (The deploy installs a systemd
# unit — deploy/responsegrid.service — that brings the stack up on every boot.)
# After it runs you SSH in and clone + deploy (see docs/deploy/aws-free-tier.md).
set -euxo pipefail

# ── 2 GB swap (essential on a 1 GiB instance running Node + Postgres + Redis) ──
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ── Docker Engine + Compose plugin (official repo) ────────────────────────────
apt-get update -y
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Let the default user run docker without sudo.
usermod -aG docker ubuntu || true
systemctl enable --now docker

echo "Provisioning done. SSH in and follow docs/deploy/aws-free-tier.md."
