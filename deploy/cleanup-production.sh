#!/bin/sh
set -eu

mode=${1:---dry-run}
case "$mode" in --dry-run|--apply) ;; *) printf 'Usage: %s [--dry-run|--apply]\n' "$0" >&2; exit 2;; esac
STATE_FILE=${STATE_FILE:-.deployment-state.json}
ENV_FILE=${ENV_FILE:-.env.production}
COMPOSE_FILE=${COMPOSE_FILE:-compose.production.yaml}
state_tool=./deploy/state-production.py
namespace=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --images | sed -n 's#^ghcr.io/\([^/]*\)/dzencode-.*#\1#p' | head -n 1)
[ -n "$namespace" ] || { printf 'Unable to resolve GHCR namespace.\n' >&2; exit 1; }

retained_for() {
  { python3 "$state_tool" "$STATE_FILE" get "$1" current; python3 "$state_tool" "$STATE_FILE" get "$1" previous; } | grep -E '^[0-9a-f]{40}$' || true
}
remove_old() {
  repository=$1 retained=$2
  docker image ls "$repository" --format '{{.Repository}}|{{.Tag}}' | while IFS='|' read -r found_repository found_tag; do
    [ "$found_repository" = "$repository" ] || continue
    [ "$found_tag" != '<none>' ] || continue
    printf '%s\n' "$retained" | grep -qx "$found_tag" && continue
    if [ "$mode" = '--dry-run' ]; then printf 'Would remove old project image: %s:%s\n' "$repository" "$found_tag"; else docker image rm "$repository:$found_tag" >/dev/null 2>&1 || printf 'Skipped in-use image: %s:%s\n' "$repository" "$found_tag" >&2; fi
  done
}

gateway_tags=$(retained_for gateway)
file_tags=$(retained_for file-service)
post_tags=$(retained_for post-service)
frontend_tags=$(retained_for frontend)
backend_tags=$(printf '%s\n%s\n%s\n' "$gateway_tags" "$file_tags" "$post_tags" | sort -u)
remove_old "ghcr.io/${namespace}/dzencode-gateway" "$gateway_tags"
remove_old "ghcr.io/${namespace}/dzencode-file-service" "$file_tags"
remove_old "ghcr.io/${namespace}/dzencode-post-service" "$post_tags"
remove_old "ghcr.io/${namespace}/dzencode-migrations" "$backend_tags"
remove_old "ghcr.io/${namespace}/dzencode-frontend" "$frontend_tags"
for image_id in $(docker image ls --filter dangling=true --filter label=org.opencontainers.image.vendor=dzencode --quiet | sort -u); do
  if [ "$mode" = '--dry-run' ]; then printf 'Would remove labeled dangling image: %s\n' "$image_id"; else docker image rm "$image_id" >/dev/null 2>&1 || true; fi
done
for container in ${MIGRATION_CONTAINERS:-}; do
  docker container inspect "$container" >/dev/null 2>&1 || continue
  status=$(docker inspect --format '{{.State.Status}}:{{.State.ExitCode}}' "$container")
  [ "$status" = 'exited:0' ] || { printf 'Preserving unsuccessful migration container: %s\n' "$container" >&2; continue; }
  if [ "$mode" = '--dry-run' ]; then printf 'Would remove successful migration container: %s\n' "$container"; else docker container rm "$container" >/dev/null; fi
done
printf 'Project-scoped cleanup %s completed; volumes, rollback images and unrelated images were preserved.\n' "$mode"
