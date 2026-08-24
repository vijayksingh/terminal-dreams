#!/usr/bin/env bash
set -Eeuo pipefail

REPOSITORY_URL="https://github.com/vijayksingh/terminal-dreams.git"
APP_ROOT="/opt/apps/terminal-dreams"
SECRETS_FILE="$APP_ROOT/secrets/app.env"
RELEASES_DIR="$APP_ROOT/releases"
LOCK_FILE="$APP_ROOT/deploy.lock"

request="${SSH_ORIGINAL_COMMAND:-${*:-}}"
if [[ ! "$request" =~ ^deploy[[:space:]]([0-9a-f]{40})$ ]]; then
  echo "Expected: deploy <40-character commit SHA>" >&2
  exit 64
fi
sha="${BASH_REMATCH[1]}"

exec 9>"$LOCK_FILE"
flock -n 9 || { echo "Another deployment is running" >&2; exit 75; }

remote_sha="$(git ls-remote "$REPOSITORY_URL" refs/heads/main | awk '{print $1}')"
[[ "$sha" == "$remote_sha" ]] || {
  echo "Refusing deployment: requested commit is not the current main HEAD" >&2
  exit 65
}

mkdir -p "$RELEASES_DIR"
release_dir="$(mktemp -d "$RELEASES_DIR/$sha.XXXXXX")"
cleanup() { rm -rf -- "$release_dir"; }
trap cleanup EXIT

echo "[deploy] checking out $sha"
git clone --quiet --filter=blob:none --no-checkout "$REPOSITORY_URL" "$release_dir"
git -C "$release_dir" fetch --quiet --depth=1 origin "$sha"
git -C "$release_dir" checkout --quiet --detach "$sha"

echo "[deploy] building immutable images"
docker build -t "terminal-dreams-pocketbase:$sha" "$release_dir/infra/pocketbase"
docker build \
  --build-arg "GIT_COMMIT=$sha" \
  --build-arg "GIT_BRANCH=main" \
  -t "terminal-dreams-app:$sha" "$release_dir"

[[ -r "$SECRETS_FILE" ]] || {
  echo "Missing deployment secrets: $SECRETS_FILE" >&2
  exit 66
}
set -a
# shellcheck disable=SC1090
. "$SECRETS_FILE"
set +a

echo "[deploy] updating Docker Swarm"
IMAGE_TAG="$sha" docker stack deploy \
  --compose-file "$release_dir/infra/compose/stack.yml" \
  --with-registry-auth \
  --resolve-image=never \
  terminal-dreams

for service in terminal-dreams_pocketbase terminal-dreams_app; do
  for _ in $(seq 1 60); do
    state="$(docker service inspect "$service" --format '{{if .UpdateStatus}}{{.UpdateStatus.State}}{{else}}completed{{end}}')"
    case "$state" in
      completed) break ;;
      rollback_completed|rollback_paused|paused)
        echo "Deployment failed for $service: $state" >&2
        exit 1
        ;;
    esac
    sleep 2
  done
  replicas="$(docker service ls --filter "name=$service" --format '{{.Replicas}}')"
  [[ "$replicas" == "1/1" ]] || {
    echo "$service is unhealthy: $replicas" >&2
    exit 1
  }
done

curl --fail --silent --show-error --retry 10 --retry-delay 3 \
  --output /dev/null https://dprophecyguy.com/
echo "[deploy] $sha is live at https://dprophecyguy.com"
