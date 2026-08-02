#!/bin/sh
set -eu

target=${1:-all}
ENV_FILE=${ENV_FILE:-.env.production}
COMPOSE_FILE=${COMPOSE_FILE:-compose.production.yaml}
MIN_FREE_GB=${MIN_FREE_GB:-8}
MIN_MEMORY_MB=${MIN_MEMORY_MB:-3800}
MIN_SWAP_MB=${MIN_SWAP_MB:-1800}

case "$target" in
  frontend|gateway|file-service|post-service|backend|all) ;;
  *) printf 'Unknown deployment target: %s\n' "$target" >&2; exit 2 ;;
esac

for command in docker python3 curl stat sha256sum; do
  command -v "$command" >/dev/null 2>&1 || { printf 'Required host command is missing: %s\n' "$command" >&2; exit 1; }
done
[ -f "$ENV_FILE" ] || { printf 'Production environment file is missing: %s\n' "$ENV_FILE" >&2; exit 1; }
[ "$(stat -c '%a' "$ENV_FILE")" = '600' ] || { printf 'Production environment file must have mode 600.\n' >&2; exit 1; }
case "$(uname -m)" in x86_64|amd64) ;; *) printf 'linux/amd64 host is required.\n' >&2; exit 1;; esac

memory_mb=$(awk '/^MemTotal:/ {print int($2 / 1024)}' /proc/meminfo)
swap_mb=$(awk '/^SwapTotal:/ {print int($2 / 1024)}' /proc/meminfo)
[ "$memory_mb" -ge "$MIN_MEMORY_MB" ] || { printf 'At least %s MB RAM is required.\n' "$MIN_MEMORY_MB" >&2; exit 1; }
[ "$swap_mb" -ge "$MIN_SWAP_MB" ] || { printf 'At least %s MB SWAP is required.\n' "$MIN_SWAP_MB" >&2; exit 1; }
free_kb=$(df -Pk . | awk 'NR == 2 {print $4}')
[ "$free_kb" -ge $((MIN_FREE_GB * 1024 * 1024)) ] || { printf 'At least %s GB free disk is required before pull.\n' "$MIN_FREE_GB" >&2; exit 1; }

docker version --format 'Docker server: {{.Server.Version}}'
docker compose version
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet
runtime_count=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --services | grep -c .)
all_services=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migrations config --services)
[ "$runtime_count" -eq 5 ] || { printf 'Expected exactly 5 runtime services.\n' >&2; exit 1; }
[ "$(printf '%s\n' "$all_services" | grep -c .)" -eq 8 ] || { printf 'Expected 5 runtime and 3 migration services.\n' >&2; exit 1; }
for service in gateway-migrations file-migrations post-migrations; do printf '%s\n' "$all_services" | grep -qx "$service" || exit 1; done
if docker ps --format '{{.Image}} {{.Names}}' | grep -Eiq '(^|[/:_-])(postgres|redis|rabbitmq|localstack)([/:_.-]|$)'; then
  printf 'Forbidden local infrastructure container is running on the production host.\n' >&2; exit 1
fi

case "$target" in
  frontend) services='frontend' ;;
  gateway) services='gateway gateway-migrations' ;;
  file-service) services='file-service file-migrations' ;;
  post-service) services='post-service post-migrations' ;;
  backend) services='gateway gateway-migrations file-service file-migrations post-service post-migrations' ;;
  all) services='frontend gateway gateway-migrations file-service file-migrations post-service post-migrations' ;;
esac
for service in $services; do
  image=$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" --profile migrations config --format json | \
    python3 -c 'import json,sys; print(json.load(sys.stdin)["services"][sys.argv[1]]["image"])' "$service")
  docker manifest inspect "$image" >/dev/null 2>&1 || { printf 'Required GHCR image is unavailable: %s\n' "$service" >&2; exit 1; }
done

python3 - "$ENV_FILE" "$target" <<'PY'
import socket, sys
from pathlib import Path
from urllib.parse import urlparse

values = {}
for raw in Path(sys.argv[1]).read_text(encoding='utf-8').splitlines():
    line = raw.strip()
    if line and not line.startswith('#') and '=' in line:
        name, value = line.split('=', 1)
        values[name.strip()] = value.strip().strip('"\'')

target = sys.argv[2]
required = set()
if target in {'gateway', 'backend', 'all'}:
    required.update({'GATEWAY_PRISMA_DB_URL': 5432, 'REDIS_URL': 6379, 'RABBITMQ_URL': 5671}.items())
if target in {'file-service', 'backend', 'all'}:
    required.update({'FILE_PRISMA_DB_URL': 5432, 'RABBITMQ_URL': 5671, 'SQS_QUEUE_URL': 443}.items())
if target in {'post-service', 'backend', 'all'}:
    required.update({'POST_PRISMA_DB_URL': 5432, 'RABBITMQ_URL': 5671}.items())
for name, default_port in required:
    parsed = urlparse(values.get(name, ''))
    if not parsed.hostname:
        raise SystemExit(f'Managed endpoint variable is missing or invalid: {name}')
    try:
        with socket.create_connection((parsed.hostname, parsed.port or default_port), timeout=5): pass
    except OSError as error:
        raise SystemExit(f'Managed endpoint is unreachable: {name}') from error
if target in {'file-service', 'backend', 'all'}:
    region = values.get('AWS_REGION', '')
    if not region: raise SystemExit('Managed endpoint variable is missing or invalid: AWS_REGION')
    try:
        with socket.create_connection((f's3.{region}.amazonaws.com', 443), timeout=5): pass
    except OSError as error:
        raise SystemExit('Managed endpoint is unreachable: S3_BUCKET') from error
PY
printf 'Preflight passed for %s.\n' "$target"
