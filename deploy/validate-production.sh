#!/bin/sh
set -eu

target=${1:-all}
ENV_FILE=${ENV_FILE:-.env.production}
COMPOSE_FILE=${COMPOSE_FILE:-compose.production.yaml}

case "$target" in
  frontend) services='frontend' ;;
  gateway) services='gateway' ;;
  file-service) services='file-service' ;;
  post-service) services='post-service' ;;
  backend) services='gateway file-service post-service' ;;
  all) services='reverse-proxy frontend gateway file-service post-service' ;;
  *) printf 'Unknown validation target: %s\n' "$target" >&2; exit 2 ;;
esac

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
for service in $services; do
  container=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps -q "$service")
  [ -n "$container" ] || { printf 'Service is not running: %s\n' "$service" >&2; exit 1; }
  status=$(docker inspect --format '{{.State.Status}}' "$container")
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container")
  if [ "$status" != 'running' ] || { [ "$health" != 'healthy' ] && [ "$health" != 'none' ]; }; then
    printf 'Service failed validation: %s\n' "$service" >&2
    exit 1
  fi
done

if [ "$target" = 'all' ] && [ "${SKIP_PUBLIC_HEALTH:-false}" != 'true' ]; then
  api_host=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T reverse-proxy printenv API_HOST)
  frontend_host=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T reverse-proxy printenv FRONTEND_HOST)
  curl --fail --silent --show-error --max-time 15 "https://${frontend_host}/api/runtime-config" >/dev/null
  curl --fail --silent --show-error --max-time 15 -H 'content-type: application/json' \
    --data '{"query":"{ __typename }"}' "https://${api_host}/api/graphql" >/dev/null
fi

printf 'Production validation passed for target %s.\n' "$target"
