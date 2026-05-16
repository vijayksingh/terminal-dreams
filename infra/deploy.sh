#!/bin/bash
# Build + deploy terminal-dreams to the local Docker Swarm.
#
# Run from the repo root or from infra/. Requires:
#   - docker (with swarm init'd) reachable as the invoking user
#   - dokploy-network external network present (provided by platform-01)
#   - secrets/app.env with POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD /
#     SESSION_SECRET. Generated on first run if missing.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_FILE="$REPO_ROOT/secrets/app.env"

mkdir -p "$REPO_ROOT/secrets"
chmod 700 "$REPO_ROOT/secrets"

gen() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32; }

if [ ! -f "$SECRETS_FILE" ]; then
    cat > "$SECRETS_FILE" <<EOF
# Generated $(date -Iseconds). DO NOT commit -- the repo's .gitignore
# excludes secrets/.
POCKETBASE_ADMIN_EMAIL=admin@terminal-dreams.local
POCKETBASE_ADMIN_PASSWORD=$(gen)
SESSION_SECRET=$(gen)
EOF
    chmod 600 "$SECRETS_FILE"
    echo "[deploy] generated $SECRETS_FILE"
fi

# shellcheck disable=SC1090
set -a; . "$SECRETS_FILE"; set +a

echo "[deploy] building pocketbase image"
docker build -t terminal-dreams-pocketbase:local "$REPO_ROOT/infra/pocketbase"

echo "[deploy] building app image"
docker build -t terminal-dreams-app:local "$REPO_ROOT"

echo "[deploy] deploying stack"
docker stack deploy \
    --compose-file "$REPO_ROOT/infra/compose/stack.yml" \
    --with-registry-auth \
    --resolve-image=never \
    terminal-dreams

echo "[deploy] waiting for pocketbase to be ready"
for _ in $(seq 1 30); do
    if docker run --rm --network dokploy-network curlimages/curl \
            -sSf -o /dev/null http://pocketbase:8090/api/health 2>/dev/null; then
        echo "[deploy] pocketbase healthy"
        break
    fi
    sleep 2
done

# Provision the PB superuser if it doesn't exist yet. PB's CLI is idempotent
# in the sense that it errors out if the user already exists -- we swallow
# that and move on.
echo "[deploy] ensuring pocketbase superuser"
PB_CID="$(docker ps -q --filter name=terminal-dreams_pocketbase | head -n1)"
if [ -n "$PB_CID" ]; then
    docker exec "$PB_CID" pocketbase superuser upsert \
        "$POCKETBASE_ADMIN_EMAIL" "$POCKETBASE_ADMIN_PASSWORD" \
        --dir=/pb/pb_data 2>&1 | tail -3 || true
fi

echo "[deploy] done"
echo
echo "Verify:"
echo "  curl --resolve terminal-dreams.local:80:127.0.0.1 http://terminal-dreams.local/"
echo
echo "PocketBase admin URL (via SSH tunnel only -- not exposed):"
echo "  ssh -L 8090:127.0.0.1:8090 admin@platform-01"
echo "  then browse http://localhost:8090/_/"
