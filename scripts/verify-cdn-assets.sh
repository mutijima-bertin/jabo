#!/usr/bin/env bash
# =============================================================================
# verify-cdn-assets.sh
# =============================================================================
# Assert that every image referenced by the database as `/uploads/<path>` is
# actually served (HTTP 200) by the public Vercel Blob CDN.
#
# Why this exists (the failure it prevents): 50 DB image references
# (`/uploads/images/<file>.webp`) pointed at files that only ever lived inside
# the running docker-era `css-backend` container (`/app/uploads/...`). 39 were
# never mirrored to the CDN, so admin + public pages showed broken images.
# It happened twice before anyone noticed. This script makes that drift loud:
# CI runs it on every push to main, so a DB reference without a CDN object
# fails the build instead of silently serving a broken image.
#
# WHAT IT DOES
#   1. Resolves DATABASE_URL (env wins; otherwise parse backend/.env.neon).
#      The value is NEVER echoed or written to a file.
#   2. Extracts every `/uploads/...` image reference from Postgres:
#        PortfolioItem.coverUrl + mediaUrls (unnest)
#        Service.imageUrl                       (non-null)
#        BlogPost.coverImageUrl                 (non-null)
#        ClientLogo.imageUrl                    (non-null)
#        SiteSetting.value                      (only values starting /uploads/)
#      Deduplicated, filtered to `/uploads/` paths.
#   3. Maps `/uploads/<x>` -> `<CDN_BASE>/<x>` and HTTP-HEADs each (no
#      redirects followed; only 200 counts as good).
#   4. Prints a summary + the broken paths; exits 1 if anything is broken.
#
# USAGE
#   scripts/verify-cdn-assets.sh [--docker-exec] [--no-docker]
#                                [--allow-empty] [--verbose] [--help]
#
#   (default)      auto: run psql inside the css-postgres container if it is
#                  running, otherwise use a host psql. On this machine the
#                  container exists, so docker-exec is the default behaviour.
#   --docker-exec  force `docker exec ... psql` (fails loudly if absent).
#   --no-docker    force a host `psql` binary (use in CI).
#   PSQL=<cmd>     override the psql command/binary for either mode.
#   --allow-empty  permit 0 extracted refs to exit 0 (normally 0 refs is an
#                  error: it almost always means the schema/query drifted).
#
# ENV (all optional)
#   DATABASE_URL    if unset, read from backend/.env.neon
#   PSQL            psql binary (default: psql)
#   CDN_BASE_URL    CDN origin (default: the public blob store below)
#
# Requires: bash, curl, psql (host or inside the container). No secrets are
# ever hardcoded or printed.
# =============================================================================
set -euo pipefail

# --- locations & constants --------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_NEON="$ROOT/backend/.env.neon"

# Public blob store documented in docs/OPERATIONS.md §11.
CDN_BASE_URL="${CDN_BASE_URL:-https://x9eveaplhocclmvl.public.blob.vercel-storage.com}"
PSQL_BIN="${PSQL:-psql}"
POSTGRES_CONTAINER="css-postgres"

# --- flags ------------------------------------------------------------------
MODE="auto"          # auto | docker | plain
ALLOW_EMPTY=0
VERBOSE=0

usage() {
  cat <<'EOF'
Usage: verify-cdn-assets.sh [options]

Options:
  --docker-exec   Force psql inside the css-postgres container.
  --no-docker     Force a host psql binary (for CI / other machines).
  --allow-empty   Let 0 extracted refs exit 0 instead of failing.
  --verbose       Print one line per reference (including OK).
  -h, --help      Show this help.

Exit codes: 0 = all refs present, 1 = any ref broken / any setup error.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --docker-exec) MODE="docker" ;;
    --no-docker)   MODE="plain" ;;
    --allow-empty) ALLOW_EMPTY=1 ;;
    --verbose)     VERBOSE=1 ;;
    -h|--help)     usage; exit 0 ;;
    *) printf 'Unknown option: %s\n\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

# --- helpers ----------------------------------------------------------------
log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Read KEY=VALUE from an env file WITHOUT sourcing it (no code execution, and
# nothing is exported into child processes). Prints the value, stripping an
# optional trailing CR and surrounding quotes. Returns empty if not found.
env_file_value() {
  # $1 = key, $2 = file
  [ -f "$2" ] || return 0
  grep -E "^[[:space:]]*$1=" "$2" 2>/dev/null \
    | tail -n 1 \
    | cut -d= -f2- \
    | tr -d '\r' \
    | sed -e "s/^[[:space:]\"']*//" -e "s/[[:space:]\"']*$//" \
    || true
}

# Resolve DATABASE_URL, env first (tolerant), then backend/.env.neon. We do
# NOT source .env.neon: a parser cannot execute a stray line, and the value is
# not exported to unrelated child processes.
resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    DB_SOURCE="environment"
    return 0
  fi
  local v
  v="$(env_file_value DATABASE_URL "$ENV_NEON")"
  if [ -z "$v" ]; then
    die "DATABASE_URL is not set and not found in $ENV_NEON. Set the env var or fix the file (it is gitignored; never commit it)."
  fi
  DATABASE_URL="$v"
  DB_SOURCE="$ENV_NEON"
}

container_running() {
  command -v docker >/dev/null 2>&1 || return 1
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$POSTGRES_CONTAINER"
}

# auto -> docker when the container is up (this machine), else host psql (CI).
resolve_mode() {
  case "$MODE" in
    docker)
      command -v docker >/dev/null 2>&1 || die "--docker-exec requested but docker is not on PATH"
      container_running || die "container '$POSTGRES_CONTAINER' is not running. Start it (docker compose up -d postgres), or use --no-docker."
      ;;
    plain)
      command -v "$PSQL_BIN" >/dev/null 2>&1 || die "--no-docker requested but '$PSQL_BIN' is not on PATH. Install postgresql-client or set PSQL=<path>."
      ;;
    auto)
      if container_running; then
        MODE="docker"
      else
        command -v "$PSQL_BIN" >/dev/null 2>&1 || die "no psql available: container '$POSTGRES_CONTAINER' is not running and '$PSQL_BIN' is not on PATH."
        MODE="plain"
      fi
      ;;
    *) die "internal: bad MODE '$MODE'" ;;
  esac
}

# Run one SQL statement via psql. Any psql error is fatal (we never want a
# failed query to look like "0 broken").
run_psql() {
  local sql="$1"
  if [ "$MODE" = "docker" ]; then
    # DATABASE_URL is passed as an argv element to psql; it is not echoed.
    docker exec -i "$POSTGRES_CONTAINER" "$PSQL_BIN" "$DATABASE_URL" \
      -X -q -v ON_ERROR_STOP=1 -A -t -c "$sql"
  else
    "$PSQL_BIN" "$DATABASE_URL" \
      -X -q -v ON_ERROR_STOP=1 -A -t -c "$sql"
  fi
}

# --- the reference query ----------------------------------------------------
# Every `/uploads/...` value across the five image sources, deduplicated.
READ_IMAGE_REFS_SQL=$(cat <<'SQL'
SELECT ref FROM (
    SELECT "coverUrl" AS ref FROM "PortfolioItem"
  UNION
    SELECT unnest("mediaUrls") FROM "PortfolioItem"
  UNION
    SELECT "imageUrl" FROM "Service"   WHERE "imageUrl"     IS NOT NULL
  UNION
    SELECT "coverImageUrl" FROM "BlogPost" WHERE "coverImageUrl" IS NOT NULL
  UNION
    SELECT "imageUrl" FROM "ClientLogo" WHERE "imageUrl"   IS NOT NULL
  UNION
    SELECT "value" FROM "SiteSetting" WHERE "value" LIKE '/uploads/%'
) refs
WHERE ref LIKE '/uploads/%'
ORDER BY ref;
SQL
)

# --- main -------------------------------------------------------------------
command -v curl >/dev/null 2>&1 || die "curl is required but not on PATH"

resolve_mode
resolve_database_url

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
REFS_FILE="$TMP_DIR/refs.txt"
BROKEN_FILE="$TMP_DIR/broken.txt"
: > "$BROKEN_FILE"

log "verify-cdn-assets: psql mode=$MODE | db source=$DB_SOURCE | base=$CDN_BASE_URL"

# Fail loudly on any psql/connection error instead of reporting 0 broken.
if ! run_psql "$READ_IMAGE_REFS_SQL" > "$REFS_FILE"; then
  die "psql failed while extracting image references (see the error above). NOT reporting a result — check DATABASE_URL / the database."
fi

TOTAL=0
while IFS= read -r _; do TOTAL=$((TOTAL + 1)); done < "$REFS_FILE"

if [ "$TOTAL" -eq 0 ]; then
  if [ "$ALLOW_EMPTY" -eq 1 ]; then
    log "verify-cdn-assets: WARNING — 0 image references extracted (--allow-empty given)."
    exit 0
  fi
  die "0 image references extracted from the database. The schema or this query has drifted — refusing to pass as '0 broken' (use --allow-empty only if an empty DB is genuinely expected)."
fi
log "verify-cdn-assets: extracted $TOTAL image references"

OK=0
BROKEN=0
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  # /uploads/<path>  ->  <CDN_BASE>/<path>
  url="$CDN_BASE_URL/${ref#/uploads/}"
  code="$(curl -sS -o /dev/null -I -w '%{http_code}' --max-time 30 -- "$url")" || code="000"
  if [ "$code" = "200" ]; then
    OK=$((OK + 1))
    if [ "$VERBOSE" -eq 1 ]; then log "ok    $ref ($code)"; fi
  else
    BROKEN=$((BROKEN + 1))
    printf '%s -> %s (%s)\n' "$ref" "$url" "$code" >> "$BROKEN_FILE"
    log "BROKEN $ref -> $url ($code)"
  fi
done < "$REFS_FILE"

log "CDN VERIFY SUMMARY: total=$TOTAL ok=$OK broken=$BROKEN (base: $CDN_BASE_URL)"

if [ "$BROKEN" -gt 0 ]; then
  printf 'Broken image references (fix with scripts/mirror-uploads-to-cdn.sh):\n' >&2
  while IFS= read -r line; do printf '  %s\n' "$line" >&2; done < "$BROKEN_FILE"
  exit 1
fi
exit 0