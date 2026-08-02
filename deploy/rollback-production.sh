#!/bin/sh
set -eu

if [ "$#" -ne 1 ]; then printf 'Usage: %s <frontend|gateway|file-service|post-service|backend|all>\n' "$0" >&2; exit 2; fi
target=$1
case "$target" in frontend|gateway|file-service|post-service|backend|all) ;; *) printf 'Unknown rollback target.\n' >&2; exit 2;; esac
ENV_FILE=${ENV_FILE:-.env.production}
COMPOSE_FILE=${COMPOSE_FILE:-compose.production.yaml}
STATE_FILE=${STATE_FILE:-.deployment-state.json}
state_tool=./deploy/state-production.py
get_state() { python3 "$state_tool" "$STATE_FILE" get "$1" "$2"; }
gateway_tag=$(get_state gateway current)
file_tag=$(get_state file-service current)
post_tag=$(get_state post-service current)
frontend_tag=$(get_state frontend current)
current_gateway_tag=$gateway_tag
current_file_tag=$file_tag
current_post_tag=$post_tag
current_frontend_tag=$frontend_tag
case "$target" in frontend) selected='frontend';; gateway) selected='gateway';; file-service) selected='file-service';; post-service) selected='post-service';; backend) selected='gateway file-service post-service';; all) selected='gateway file-service post-service frontend';; esac
for service in $selected; do
  previous=$(get_state "$service" previous)
  [ -n "$previous" ] || { printf 'No previous successful image for %s.\n' "$service" >&2; exit 1; }
  case "$service" in gateway) gateway_tag=$previous;; file-service) file_tag=$previous;; post-service) post_tag=$previous;; frontend) frontend_tag=$previous;; esac
done
export GATEWAY_IMAGE_TAG="$gateway_tag" FILE_SERVICE_IMAGE_TAG="$file_tag" POST_SERVICE_IMAGE_TAG="$post_tag" FRONTEND_IMAGE_TAG="$frontend_tag"
# The service list is fixed by the allowlisted target switch above.
# shellcheck disable=SC2086
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" pull $selected
# shellcheck disable=SC2086
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --wait $selected
if ! ENV_FILE=$ENV_FILE COMPOSE_FILE=$COMPOSE_FILE sh ./deploy/validate-production.sh "$target"; then
  export GATEWAY_IMAGE_TAG="$current_gateway_tag" FILE_SERVICE_IMAGE_TAG="$current_file_tag" POST_SERVICE_IMAGE_TAG="$current_post_tag" FRONTEND_IMAGE_TAG="$current_frontend_tag"
  # shellcheck disable=SC2086
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --no-deps --wait $selected || true
  printf 'Rollback healthcheck failed; current application images were restored.\n' >&2
  exit 1
fi
for service in $selected; do python3 "$state_tool" "$STATE_FILE" rollback "$service" "rollback:$target"; done
printf 'Application rollback completed for %s; production migrations were not reverted.\n' "$target"
