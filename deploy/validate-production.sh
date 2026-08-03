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

retry_public_check() {
  description=$1
  shift

  attempt=1
  max_attempts=18

  while [ "$attempt" -le "$max_attempts" ]; do
    if curl \
      --fail \
      --silent \
      --show-error \
      --connect-timeout 5 \
      --max-time 15 \
      "$@" >/dev/null; then
      printf '%s passed on attempt %s.\n' "$description" "$attempt"
      return 0
    fi

    printf '%s failed on attempt %s/%s; retrying in 5 seconds.\n' \
      "$description" "$attempt" "$max_attempts" >&2

    attempt=$((attempt + 1))

    if [ "$attempt" -le "$max_attempts" ]; then
      sleep 5
    fi
  done

  printf '%s failed after %s attempts.\n' \
    "$description" "$max_attempts" >&2

  return 1
}

if [ "$target" = 'all' ] && [ "${SKIP_PUBLIC_HEALTH:-false}" != 'true' ]; then
  api_host=$(
    docker compose \
      --env-file "$ENV_FILE" \
      -f "$COMPOSE_FILE" \
      exec -T reverse-proxy \
      printenv API_HOST
  )

  frontend_host=$(
    docker compose \
      --env-file "$ENV_FILE" \
      -f "$COMPOSE_FILE" \
      exec -T reverse-proxy \
      printenv FRONTEND_HOST
  )

  retry_public_check \
    'Frontend runtime configuration check' \
    "https://${frontend_host}/api/runtime-config"

  retry_public_check \
    'Gateway GraphQL check' \
    -H 'content-type: application/json' \
    --data '{"query":"{ __typename }"}' \
    "https://${api_host}/api/graphql"
fi

printf 'Production validation passed for target %s.\n' "$target"
