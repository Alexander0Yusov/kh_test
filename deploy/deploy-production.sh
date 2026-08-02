#!/bin/sh
set -eu

if [ "$#" -ne 4 ]; then
  printf 'Usage: %s <target> <backend-sha|-> <frontend-sha|-> <source>\n' "$0" >&2
  exit 2
fi
target=$1
backend_sha=$2
frontend_sha=$3
source_metadata=$4
case "$target" in frontend|gateway|file-service|post-service|backend|all) ;; *) printf 'Unknown target.\n' >&2; exit 2;; esac
case "$target" in gateway|file-service|post-service|backend|all) printf '%s' "$backend_sha" | grep -Eq '^[0-9a-f]{40}$' || exit 2;; esac
case "$target" in frontend|all) printf '%s' "$frontend_sha" | grep -Eq '^[0-9a-f]{40}$' || exit 2;; esac

ENV_FILE=${ENV_FILE:-.env.production}
COMPOSE_FILE=${COMPOSE_FILE:-compose.production.yaml}
STATE_FILE=${STATE_FILE:-.deployment-state.json}
MIGRATION_LOG_DIR=${MIGRATION_LOG_DIR:-deploy/logs}
CADDY_HASH_FILE=${CADDY_HASH_FILE:-.caddyfile.sha256}
state_tool=./deploy/state-production.py

get_state() { python3 "$state_tool" "$STATE_FILE" get "$1" "$2"; }
if [ "$target" != 'all' ]; then
  python3 "$state_tool" "$STATE_FILE" initialized || {
    printf 'Granular deployment requires an initialized production stack; use target all first.\n' >&2
    exit 1
  }
  for service in reverse-proxy frontend gateway file-service post-service; do
    [ -n "$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --status running -q "$service")" ] || {
      printf 'Production stack is incomplete; use target all.\n' >&2; exit 1;
    }
  done
fi

current_gateway=$(get_state gateway current)
current_file=$(get_state file-service current)
current_post=$(get_state post-service current)
current_frontend=$(get_state frontend current)
export GATEWAY_IMAGE_TAG="${current_gateway:-$backend_sha}"
export FILE_SERVICE_IMAGE_TAG="${current_file:-$backend_sha}"
export POST_SERVICE_IMAGE_TAG="${current_post:-$backend_sha}"
export FRONTEND_IMAGE_TAG="${current_frontend:-$frontend_sha}"
case "$target" in
  gateway) GATEWAY_IMAGE_TAG=$backend_sha ;;
  file-service) FILE_SERVICE_IMAGE_TAG=$backend_sha ;;
  post-service) POST_SERVICE_IMAGE_TAG=$backend_sha ;;
  backend) GATEWAY_IMAGE_TAG=$backend_sha; FILE_SERVICE_IMAGE_TAG=$backend_sha; POST_SERVICE_IMAGE_TAG=$backend_sha ;;
  frontend) FRONTEND_IMAGE_TAG=$frontend_sha ;;
  all) GATEWAY_IMAGE_TAG=$backend_sha; FILE_SERVICE_IMAGE_TAG=$backend_sha; POST_SERVICE_IMAGE_TAG=$backend_sha; FRONTEND_IMAGE_TAG=$frontend_sha ;;
esac

caddy_was_running=false
caddy_hash=''
previous_caddy_hash=''
if [ "$target" = 'all' ]; then
  [ -n "$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --status running -q reverse-proxy)" ] && caddy_was_running=true
  caddy_hash=$(sha256sum deploy/Caddyfile | awk '{print $1}')
  [ ! -f "$CADDY_HASH_FILE" ] || previous_caddy_hash=$(sed -n '1p' "$CADDY_HASH_FILE")
fi
export GATEWAY_IMAGE_TAG FILE_SERVICE_IMAGE_TAG POST_SERVICE_IMAGE_TAG FRONTEND_IMAGE_TAG

ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE sh ./deploy/preflight-production.sh "$target"
case "$target" in
  frontend) app_services='frontend'; migration_services='' ;;
  gateway) app_services='gateway'; migration_services='gateway-migrations' ;;
  file-service) app_services='file-service'; migration_services='file-migrations' ;;
  post-service) app_services='post-service'; migration_services='post-migrations' ;;
  backend) app_services='gateway file-service post-service'; migration_services='gateway-migrations file-migrations post-migrations' ;;
  all) app_services='reverse-proxy frontend gateway file-service post-service'; migration_services='gateway-migrations file-migrations post-migrations' ;;
esac

# Service lists are fixed by the allowlisted target switch above.
# shellcheck disable=SC2086
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migrations pull $app_services $migration_services
umask 077
mkdir -p "$MIGRATION_LOG_DIR"
successful_migration_containers=''
for service in $migration_services; do
  migration_sha=$backend_sha
  container="dzencode-production-${service}-${migration_sha}-$(date -u '+%Y%m%dT%H%M%SZ')"
  log_file="${MIGRATION_LOG_DIR}/${container}.log"
  if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migrations run --name "$container" "$service"; then result=0; else result=$?; fi
  docker logs "$container" >"$log_file" 2>&1 || true
  if [ "$result" -ne 0 ]; then
    printf 'Migration failed; container and log retained: %s %s\n' "$container" "$log_file" >&2
    exit "$result"
  fi
  successful_migration_containers="$successful_migration_containers $container"
done

# shellcheck disable=SC2086
if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --wait $app_services || \
   { [ "$target" != 'all' ] || [ "$caddy_was_running" != 'true' ] || [ "$caddy_hash" = "$previous_caddy_hash" ] || \
     docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T reverse-proxy caddy reload --config /etc/caddy/Caddyfile; } || \
   ! ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE sh ./deploy/validate-production.sh "$target"; then
  printf 'Health validation failed; restoring only selected application images.\n' >&2
  export GATEWAY_IMAGE_TAG="${current_gateway:-$GATEWAY_IMAGE_TAG}"
  export FILE_SERVICE_IMAGE_TAG="${current_file:-$FILE_SERVICE_IMAGE_TAG}"
  export POST_SERVICE_IMAGE_TAG="${current_post:-$POST_SERVICE_IMAGE_TAG}"
  export FRONTEND_IMAGE_TAG="${current_frontend:-$FRONTEND_IMAGE_TAG}"
  if [ "$target" != 'all' ] || python3 "$state_tool" "$STATE_FILE" initialized; then
    # shellcheck disable=SC2086
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --wait $app_services || true
  fi
  printf 'Deployment failed; migrations and diagnostic containers/logs are retained and not rolled back.\n' >&2
  exit 1
fi

case "$target" in
  gateway) promoted='gateway' ;;
  file-service) promoted='file-service' ;;
  post-service) promoted='post-service' ;;
  frontend) promoted='frontend' ;;
  backend) promoted='gateway file-service post-service' ;;
  all) promoted='gateway file-service post-service frontend' ;;
esac
for service in $promoted; do
  case "$service" in frontend) sha=$frontend_sha;; *) sha=$backend_sha;; esac
  python3 "$state_tool" "$STATE_FILE" promote "$service" "$sha" "$source_metadata"
done
[ "$target" != 'all' ] || printf '%s\n' "$caddy_hash" >"$CADDY_HASH_FILE"

if ! STATE_FILE=$STATE_FILE MIGRATION_CONTAINERS="$successful_migration_containers" sh ./deploy/cleanup-production.sh --apply; then
  printf 'Deployment succeeded, but project-scoped cleanup requires review.\n' >&2
fi
printf 'Deployment completed for target %s.\n' "$target"
