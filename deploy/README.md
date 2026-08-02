# Production deployment control plane

The backend repository is the sole owner of production Compose, Caddy, SSH and
the protected GitHub `production` Environment. The frontend repository only
verifies and publishes its prebuilt Next standalone image; it receives no VPS
credentials. Nothing in this foundation performs deployment until
`PRODUCTION_DEPLOY_ENABLED=true`.

## Runtime topology and host

HOSTiQ kVPS50 runs Ubuntu 24 LTS on `linux/amd64` (2 vCPU, 4096 MB RAM,
2048 MB SWAP, 50 GB SSD). Exactly five containers stay running:

| Service | Image/startup | Internal port | RAM / CPU |
| --- | --- | ---: | ---: |
| Caddy | `caddy:2.10.2-alpine` | 80/443 | 128 MB / .25 |
| Frontend | `dzencode-frontend:<sha>`, `node server.js` | 3000 | 512 MB / .50 |
| Gateway | `dzencode-gateway:<sha>`, compiled Nest entrypoint | 3000 | 768 MB / .75 |
| File Service | `dzencode-file-service:<sha>`, compiled Nest entrypoint | 50052 | 512 MB / .50 |
| Post Service | `dzencode-post-service:<sha>`, compiled Nest entrypoint | 50053 | 384 MB / .40 |

Only Caddy publishes host ports: TCP 80/443 and UDP 443 for HTTP/3. It routes
`FRONTEND_HOST` to frontend and `API_HOST` to Gateway, including Socket.IO
upgrades, and keeps ACME state in named volumes. Application deployments do not
rebuild or recreate Caddy. `all` includes Caddy so a missing proxy is created;
Compose leaves an unchanged proxy intact. The `all` script compares the trusted
Caddyfile hash and performs an in-place `caddy reload` only when its content
changed, preserving ACME volumes and the running proxy container.

Three profile-gated one-shot services exist: `gateway-migrations`,
`file-migrations`, and `post-migrations`. Each receives only its owner's direct
`PRISMA_DB_URL`, uses `dzencode-migrations:<same-backend-sha>`, and runs only
that schema's `prisma migrate deploy`. Successful containers are removed after
health validation and their mode-0600 logs remain. A failed container and log
are retained. No package install, Prisma generation, TypeScript/Next build or
Docker build occurs on the VPS.

Regular Compose `mem_limit`, `cpus`, and `json-file` rotation (`10m`, 3 files)
apply to every container. The five runtime caps total 2304 MB, leaving room for
Ubuntu/Docker and startup spikes; one migration can temporarily add 768 MB.
Verify enforcement with:

```sh
docker inspect --format '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}} {{json .HostConfig.LogConfig}}' \
  "$(docker compose --env-file .env.production -f compose.production.yaml ps -q gateway)"
```

Do not run PostgreSQL, Redis, RabbitMQ, LocalStack, S3 or SQS on the VPS. All
are managed external services. Expected retained application images are below
3 GB because layers are shared. Before deployment use `df -h .` and
`docker system df -v`; preflight refuses pulls below 8 GB free.

## Trusted candidate and final deployment protocol

The only accepted backend PR comments are:

```text
/deploy production frontend
/deploy production gateway
/deploy production file-service
/deploy production post-service
/deploy production backend
/deploy production all
/deploy production frontend frontend-pr=<number>
/deploy production all frontend-pr=<number>
```

Extra tokens, typos, manual SHAs, invalid PR numbers, or `frontend-pr` on other
targets are rejected. `workflow_dispatch` exposes the same required target
choice and an optional frontend PR number.

For an open same-repository backend PR, the workflow resolves the current
`head.sha`, requires exact-SHA successful Backend CI, and requires all selected
immutable GHCR images. Every push changes the SHA: old CI, images and comments
authorize nothing for the new commit. A new green CI and a new comment are
required. The SHA is fetched again after Environment approval and immediately
before SSH, preventing a stale-head deployment.

After merge there is no automatic deployment. Once main CI and publish finish,
repeat the comment in the merged PR. It resolves `merge_commit_sha`, validates
that exact SHA and performs a separate deliberate final deployment. Thus one
long-lived PR may have multiple candidate deployments and exactly selected
final deployments without copying a backend SHA.

`frontend-pr=<number>` resolves the configured
`PRODUCTION_FRONTEND_REPOSITORY`: open PR uses its current `head.sha`; merged PR
uses `merge_commit_sha`. Forks are rejected, exact frontend CI and
`dzencode-frontend:<sha>` are required. Plain `frontend` uses the already chosen
`PRODUCTION_FRONTEND_IMAGE_SHA`, suitable for stable redeploy/rollback. A
private frontend repository needs `PRODUCTION_FRONTEND_READ_TOKEN`, a
fine-grained token limited to read Metadata, Pull requests, Checks/Actions and
Packages for that repository. It needs no Contents Write, Actions Write,
Administration or SSH access.

The `issue_comment` workflow and all secret-bearing scripts, Compose and Caddy
configuration are checked out only from the default branch. PR code is never
executed with production secrets; it supplies only an application image SHA.
Deployment-infrastructure edits become active only after their own review and
merge to main. Manual `workflow_dispatch` runs are also rejected unless the
selected workflow ref is `main`.

Both publish workflows are triggered only after successful CI. Same-repository
PRs publish candidate images and main publishes stable images, always under the
full immutable SHA for `linux/amd64`. Fork workflows cannot obtain package
write permission. Docker builds perform Prisma generation before Nest builds;
the generated clients are already inside immutable runtime images.

## Granular targets and migrations

| Target | Migrations before update | Runtime services updated |
| --- | --- | --- |
| `frontend` | none | frontend only |
| `gateway` | Gateway DB | gateway only |
| `file-service` | Files DB | file-service only |
| `post-service` | Posts DB | post-service only |
| `backend` | Gateway, then Files, then Posts; all must pass first | all three backend services |
| `all` | Gateway, then Files, then Posts | four apps; create/update Caddy only as needed |

Granular targets require an initialized five-container stack and state file;
an empty host fails with guidance to use `all`. First deployment is always:

```sh
sh deploy/deploy-production.sh all <backend-full-sha> <frontend-full-sha> bootstrap
```

A migration already applied to production must never be edited in a later
commit of the same PR. Corrections are new forward migrations. Application
rollback does not undo schema changes; releases require backward-compatible
expand/contract migrations.

## Environment isolation

`/opt/dzencode/.env.production` (mode 0600) is the only host runtime source.
Compose maps values explicitly; it is never attached wholesale to a container:

| Container | Environment exposure |
| --- | --- |
| Caddy | `FRONTEND_HOST`, `API_HOST`, `ACME_EMAIL` |
| Frontend | derived public `BACKEND_URL`, `HOSTNAME`, `PORT` |
| Gateway | Gateway DB, JWT, Redis, RabbitMQ, frontend origin, gRPC internal URLs, CAPTCHA/runtime values |
| File Service | Files DB, RabbitMQ, AWS/S3/SQS and Files runtime values |
| Post Service | Posts DB, RabbitMQ and Posts gRPC bind URL |
| each migration runner | `NODE_ENV` and only its owner's `PRISMA_DB_URL` |

There is one direct database URL per service; no artificial `*_DIRECT` value.
Secrets are never build args, repository files, image content or log output.
Browser values are `FRONTEND_ORIGIN=https://${FRONTEND_HOST}` and
`BACKEND_URL=https://${API_HOST}/api`; sibling subdomains preserve the accepted
Secure/HttpOnly/SameSite cookie model. Production S3 CORS must separately allow
that exact frontend origin.

## State, rollback and cleanup

`.deployment-state.json` stores current and one previous successful SHA for
each of gateway, file-service, post-service and frontend, with UTC timestamp
and PR/merge source metadata. It contains no secrets and is written atomically
with mode 0600.

```sh
sh deploy/rollback-production.sh frontend
sh deploy/rollback-production.sh gateway
sh deploy/rollback-production.sh file-service
sh deploy/rollback-production.sh post-service
sh deploy/rollback-production.sh backend
sh deploy/rollback-production.sh all
```

Rollback changes only selected application images. It never rolls back DB
migrations, Caddy, volumes or unrelated containers. Failed health validation
restores only the selected previous images and retains diagnostic logs.

Cleanup defaults to report-only:

```sh
STATE_FILE=.deployment-state.json sh deploy/cleanup-production.sh --dry-run
```

After successful healthchecks deployment uses `--apply`. Cleanup retains the
current and exactly one previous SHA per application (and the union for the
migration image), removes only older `ghcr.io/<namespace>/dzencode-*` tags and
project-labeled dangling layers, and removes only successful migration
containers. It never runs `docker system prune -a`, removes volumes, touches
foreign images, or runs after a failed deployment.

## Host bootstrap and production inventory

Initially log in as root, install Docker Engine and Compose plugin, create an
unprivileged deploy user and install its SSH key. Verify a second key-only SSH
session before manually disabling password and root login; hardening is not
automated. Allow the actual SSH port and TCP 80/443; allow UDP 443 only while
HTTP/3 is used. Configure exact Cloudflare A records later; unrelated wildcard
DNS remains untouched. Caddy obtains ACME certificates without HOSTiQ SSL.

GitHub Environment variables:

- `PRODUCTION_DEPLOY_ENABLED`
- `PRODUCTION_SSH_HOST`, `PRODUCTION_SSH_PORT`, `PRODUCTION_SSH_USER`, `PRODUCTION_DEPLOY_PATH`
- `PRODUCTION_GHCR_NAMESPACE`
- `PRODUCTION_BACKEND_IMAGE_SHA`, `PRODUCTION_FRONTEND_IMAGE_SHA`
- `PRODUCTION_FRONTEND_REPOSITORY`

Environment secrets:

- `PRODUCTION_SSH_PRIVATE_KEY`
- `PRODUCTION_SSH_KNOWN_HOSTS`
- optional `PRODUCTION_FRONTEND_READ_TOKEN` only for a private frontend repository

Host secret inventory: `RABBITMQ_URL`, three service-specific
`*_PRISMA_DB_URL`, JWT secrets, `REDIS_URL`, and AWS credentials. Non-secret
host configuration remains in the tracked example by name/placeholders only.

Bootstrap order avoids chicken-and-egg: statically validate and merge this
foundation while deployment is disabled; only main then becomes the trusted
control plane. Verify candidate/stable GHCR publication, configure host/DNS/
Environment, enable deployment, and perform the first `all`. Real VPS access,
firewall, DNS, ACME issuance, managed connectivity, production migrations and
end-to-end validation remain blocked until those external resources exist.
