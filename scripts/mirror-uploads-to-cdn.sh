#!/usr/bin/env bash
# =============================================================================
# mirror-uploads-to-cdn.sh
# =============================================================================
# Push missing image files to the public Vercel Blob CDN so that every
# `/uploads/<path>` referenced by the database resolves to a real object.
#
# This is the FIX half of the pair (docs/OPERATIONS.md §11):
#     scripts/verify-cdn-assets.sh          -> detects drift (read-only)
#     scripts/mirror-uploads-to-cdn.sh      -> repairs it (uploads)
#
# WHAT IT DOES
#   1. Extracts the same `/uploads/...` references from Postgres as the verify
#      script (PortfolioItem.coverUrl/mediaUrls, Service.imageUrl,
#      BlogPost.coverImageUrl, ClientLogo.imageUrl, SiteSetting.value).
#      With --all it instead unions in EVERY file found in the docker-era
#      source of truth and the repo-local uploads dir (the full archival
#      mirror), so nothing docker-era can be lost again.
#   2. HEADs each candidate on the CDN; anything not returning 200 is pending.
#   3. Locates each pending file:
#        first: backend/uploads/<path>        (repo-local copy, if present)
#        else : docker exec css-backend cat /app/uploads/<path>
#               (the docker-era source of truth — 204 files)
#        else : reported as NOT-RECOVERABLE (exit 1, loudly)
#   4. Uploads with the Vercel CLI:
#        npx --yes vercel blob put <file> --pathname "<path>" \
#            --access public --allow-overwrite true
#      using BLOB_READ_WRITE_TOKEN (env first, else backend/.env.neon).
#
# Idempotent / resumable: objects already on the CDN are skipped, so an
# interrupted run can simply be re-run. Nothing is ever deleted.
#
# USAGE
#   scripts/mirror-uploads-to-cdn.sh [--check] [--all]
#                                    [--docker-exec | --no-docker] [--verbose]
#
#   (default)      mirror only DB-referenced files that are missing on the CDN
#   --check        dry run: report what WOULD be uploaded; write nothing
#   --all          also mirror every docker-era / repo-local file that is not
#                  on the CDN (requires the css-backend container; dies
#                  loudly if it is unavailable)
#   --docker-exec / --no-docker / PSQL=<bin>   psql mode, see verify script
#   --verbose      also print files that are already present
#
# ENV (optional; never hardcoded, never printed)
#   DATABASE_URL           env wins, else parsed from backend/.env.neon
#   BLOB_READ_WRITE_TOKEN  env wins, else parsed from backend/.env.neon;
#                          required for real uploads (not for --check)
#   PSQL, CDN_BASE_URL     as in verify-cdn-assets.sh
#
# Exit codes: 0 = nothing pending / everything uploaded; 1 = at least one
# NOT-RECOVERABLE or failed upload, any setup/query error, or a 0-row
# extraction (a failed query must never look like "all present").
# =============================================================================
set -euo pipefail

# --- locations & constants --------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_NEON="$ROOT/backend/.env.neon"
REPO_UPLOADS="$ROOT/backend/uploads"          # repo-local files (e.g. images/<file>)
DOCKER_UPLOADS="/app/uploads"                 # css-backend container path
POSTGRES_CONTAINER="css-postgres"
BACKEND_CONTAINER="css-backend"

CDN_BASE_URL="${CDN_BASE_URL:-https://x9eveaplhocclmvl.public.blob.vercel-storage.com}"
PSQL_BIN="${PSQL:-psql}"

# --- flags ------------------------------------------------------------------
MODE="auto"        # auto | docker | plain   (psql invocation only)
DO_CHECK=0         # --check : dry run
DO_ALL=0           # --all   : full archival mirror
VERBOSE=0

usage() {
  cat <<'EOF'
Usage: mirror-uploads-to-cdn.sh [options]

Options:
  --check         Dry run: report what would be uploaded, write nothing.
  --all           Also mirror every docker-era/repo-local file missing on
                  the CDN (requires the css-backend container).
  --docker-exec   Force psql inside the css-postgres container.
  --no-docker     Force a host psql binary (for CI / other machines).
  --verbose       Also print candidates that are already on the CDN.
  -h, --help      Show this help.

Exit codes: 0 = everything present/uploaded, 1 = NOT-RECOVERABLE, upload
failure, or any setup/query error.
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)       DO_CHECK=1 ;;
    --all)         DO_ALL=1 ;;
    --docker-exec) MODE="docker" ;;
    --no-docker)   MODE="plain" ;;
    --verbose)     VERBOSE=1 ;;
    -h|--help)     usage; exit 0 ;;
    *) printf 'Unknown option: %s\n\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

# --- helpers ----------------------------------------------------------------
log() { printf '%s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Read KEY=VALUE from an env file WITHOUT sourcing it (never executes file
# content, never exports the value to unrelated children). Empty if absent.
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

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    DB_SOURCE="environment"
    return 0
  fi
  local v
  v="$(env_file_value DATABASE_URL "$ENV_NEON")"
  if [ -z "$v" ]; then
    die "DATABASE_URL is not set and not found in $ENV_NEON. Set the env var or fix the file (gitignored; never commit it)."
  fi
  DATABASE_URL="$v"
  DB_SOURCE="$ENV_NEON"
}

resolve_blob_token() {
  if [ -n "${BLOB_READ_WRITE_TOKEN:-}" ]; then
    TOKEN_SOURCE="environment"
    return 0
  fi
  local v
  v="$(env_file_value BLOB_READ_WRITE_TOKEN "$ENV_NEON")"
  if [ -z "$v" ]; then
    # A dry run never uploads, so the token is optional there — but a real
    # run that silently lacked the token must not happen.
    if [ "$DO_CHECK" -eq 1 ]; then
      TOKEN_SOURCE="absent"
      return 0
    fi
    die "BLOB_READ_WRITE_TOKEN is not set and not found in $ENV_NEON. Needed to upload; get it from the css-backend-blob-public store (Vercel → Storage)."
  fi
  BLOB_READ_WRITE_TOKEN="$v"
  TOKEN_SOURCE="$ENV_NEON"
}

pg_container_running() {
  command -v docker >/dev/null 2>&1 || return 1
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$POSTGRES_CONTAINER"
}

# The css-backend container is the docker-era source of truth for files.
backend_container_running() {
  command -v docker >/dev/null 2>&1 || return 1
  docker ps --format '{{.Names}}' 2>/dev/null | grep -qx "$BACKEND_CONTAINER"
}

resolve_mode() {
  case "$MODE" in
    docker)
      command -v docker >/dev/null 2>&1 || die "--docker-exec requested but docker is not on PATH"
      pg_container_running || die "container '$POSTGRES_CONTAINER' is not running. Start it (docker compose up -d postgres), or use --no-docker."
      ;;
    plain)
      command -v "$PSQL_BIN" >/dev/null 2>&1 || die "--no-docker requested but '$PSQL_BIN' is not on PATH. Install postgresql-client or set PSQL=<path>."
      ;;
    auto)
      if pg_container_running; then
        MODE="docker"
      else
        command -v "$PSQL_BIN" >/dev/null 2>&1 || die "no psql available: container '$POSTGRES_CONTAINER' is not running and '$PSQL_BIN' is not on PATH."
        MODE="plain"
      fi
      ;;
    *) die "internal: bad MODE '$MODE'" ;;
  esac
}

run_psql() {
  local sql="$1"
  if [ "$MODE" = "docker" ]; then
    docker exec -i "$POSTGRES_CONTAINER" "$PSQL_BIN" "$DATABASE_URL" \
      -X -q -v ON_ERROR_STOP=1 -A -t -c "$sql"
  else
    "$PSQL_BIN" "$DATABASE_URL" \
      -X -q -v ON_ERROR_STOP=1 -A -t -c "$sql"
  fi
}

# Same reference extraction as verify-cdn-assets.sh (kept independent on
# purpose — each script must stay runnable on its own).
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

# HTTP status on the CDN for one blob pathname (200 = present).
cdn_status() {
  # $1 = pathname, e.g. images/foo.webp
  local code
  code="$(curl -sS -o /dev/null -I -w '%{http_code}' --max-time 30 -- "$CDN_BASE_URL/$1")" || code="000"
  printf '%s' "$code"
}

# Is the file available on this machine? Prints "repo", "docker", or "" .
locate_file() {
  # $1 = pathname relative to the uploads root, e.g. images/foo.webp
  if [ -f "$REPO_UPLOADS/$1" ]; then
    printf 'repo'
  elif [ "$DOCKER_SRC_OK" -eq 1 ] \
       && docker exec "$BACKEND_CONTAINER" sh -c '[ -f "$1" ]' sh "$DOCKER_UPLOADS/$1"; then
    printf 'docker'
  fi
}

# --- main -------------------------------------------------------------------
command -v curl >/dev/null 2>&1 || die "curl is required but not on PATH"
if [ "$DO_CHECK" -eq 0 ]; then
  command -v npx >/dev/null 2>&1 || die "npx is required but not on PATH (Node.js must be installed)"
fi

resolve_mode
resolve_database_url
resolve_blob_token
# The token is only exported for real runs; --check needs nothing from the store.
if [ "$TOKEN_SOURCE" != "absent" ]; then
  export BLOB_READ_WRITE_TOKEN
fi

DOCKER_SRC_OK=0
if backend_container_running; then DOCKER_SRC_OK=1; fi
if [ "$DO_ALL" -eq 1 ] && [ "$DOCKER_SRC_OK" -eq 0 ]; then
  # --all is the archival mirror: silently covering only the repo-local subset
  # would defeat its purpose, so refuse instead of doing a partial job.
  die "--all needs the '$BACKEND_CONTAINER' container (docker-era source of truth) but it is not running. Start it, or run without --all."
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
REFS_FILE="$TMP_DIR/refs.txt"
CAND_FILE="$TMP_DIR/candidates.txt"
NOT_REC_FILE="$TMP_DIR/not-recoverable.txt"
FAILED_FILE="$TMP_DIR/failed.txt"
: > "$NOT_REC_FILE"
: > "$FAILED_FILE"

log "mirror-uploads-to-cdn: psql mode=$MODE | db source=$DB_SOURCE | base=$CDN_BASE_URL | mode=$([ "$DO_CHECK" -eq 1 ] && printf 'CHECK (dry run)' || printf 'upload')$([ "$DO_ALL" -eq 1 ] && printf ' +all' || printf ' (db-referenced only)')"

if ! run_psql "$READ_IMAGE_REFS_SQL" > "$REFS_FILE"; then
  die "psql failed while extracting image references (see the error above). NOT reporting a result — check DATABASE_URL / the database."
fi
DB_REFS="$(wc -l < "$REFS_FILE" | tr -d ' ')"
if [ "$DB_REFS" -eq 0 ]; then
  # An empty result almost always means schema/query drift, not an empty DB
  # (the seed always writes SiteSettings). Never report "all good" from it.
  die "0 image references extracted from the database. The schema or this query has drifted — refusing to report success."
fi

# --- build the candidate list (blob pathnames, no /uploads/ prefix) ---------
: > "$CAND_FILE"
while IFS= read -r ref; do
  [ -n "$ref" ] || continue
  rel="${ref#/uploads/}"
  [ -n "$rel" ] && printf '%s\n' "$rel" >> "$CAND_FILE"
done < "$REFS_FILE"

if [ "$DO_ALL" -eq 1 ]; then
  # Every repo-local file …
  if [ -d "$REPO_UPLOADS" ]; then
    ( cd "$REPO_UPLOADS" && find . -type f -print ) \
      | sed -e 's#^\./##' >> "$CAND_FILE"
  fi
  # … plus every docker-era file (the 204-file source of truth).
  docker exec "$BACKEND_CONTAINER" sh -c "find $DOCKER_UPLOADS -type f -print" \
    | sed -e "s#^$DOCKER_UPLOADS/##" >> "$CAND_FILE"
fi
sort -u "$CAND_FILE" -o "$CAND_FILE"

CANDIDATES="$(wc -l < "$CAND_FILE" | tr -d ' ')"

# --- classify each candidate ----------------------------------------------
PRESENT=0
PENDING=0
while IFS= read -r rel; do
  [ -n "$rel" ] || continue
  status="$(cdn_status "$rel")"
  if [ "$status" = "200" ]; then
    PRESENT=$((PRESENT + 1))
    if [ "$VERBOSE" -eq 1 ]; then log "present  $rel"; fi
    continue
  fi

  PENDING=$((PENDING + 1))
  src="$(locate_file "$rel")"
  if [ -z "$src" ]; then
    printf '%s (cdn=%s)\n' "$rel" "$status" >> "$NOT_REC_FILE"
    log "NOT-RECOVERABLE $rel (cdn=$status; not in $REPO_UPLOADS and not in $BACKEND_CONTAINER:$DOCKER_UPLOADS)"
    continue
  fi

  if [ "$DO_CHECK" -eq 1 ]; then
    log "WOULD UPLOAD $rel (from $src; cdn=$status)"
    continue
  fi

  # Real upload: materialise the file, then hand it to the Vercel CLI.
  tmp_file="$TMP_DIR/upload.bin"
  if [ "$src" = "repo" ]; then
    cp "$REPO_UPLOADS/$rel" "$tmp_file"
  else
    docker exec "$BACKEND_CONTAINER" sh -c 'cat "$1"' sh "$DOCKER_UPLOADS/$rel" > "$tmp_file" || true
  fi
  if [ ! -s "$tmp_file" ]; then
    printf '%s (source=%s)\n' "$rel" "$src" >> "$FAILED_FILE"
    log "FAILED to read source for $rel (from $src)"
    rm -f "$tmp_file"
    continue
  fi

  if npx --yes vercel blob put "$tmp_file" \
        --pathname "$rel" \
        --access public \
        --allow-overwrite true \
        < /dev/null; then
    log "uploaded $rel (from $src)"
  else
    printf '%s (source=%s)\n' "$rel" "$src" >> "$FAILED_FILE"
    log "FAILED upload for $rel (from $src)"
  fi
  rm -f "$tmp_file"
done < "$CAND_FILE"

# --- summary ----------------------------------------------------------------
NOT_REC="$(wc -l < "$NOT_REC_FILE" | tr -d ' ')"
FAILED="$(wc -l < "$FAILED_FILE" | tr -d ' ')"

if [ "$DO_CHECK" -eq 1 ]; then
  log "CDN MIRROR --check SUMMARY: db_refs=$DB_REFS candidates=$CANDIDATES present=$PRESENT would_upload=$((PENDING - NOT_REC)) not_recoverable=$NOT_REC"
  if [ "$PENDING" -eq 0 ]; then
    log "Nothing to upload — every candidate is already on the CDN."
  else
    log "Dry run: nothing was uploaded. Run without --check to fix the $PENDING pending file(s)."
  fi
else
  UPLOADED=$((PENDING - NOT_REC - FAILED))
  log "CDN MIRROR SUMMARY: db_refs=$DB_REFS candidates=$CANDIDATES present=$PRESENT uploaded=$UPLOADED not_recoverable=$NOT_REC failed=$FAILED"
fi

if [ "$NOT_REC" -gt 0 ] || [ "$FAILED" -gt 0 ]; then
  if [ "$NOT_REC" -gt 0 ]; then
    printf 'NOT-RECOVERABLE (no local copy anywhere — see docker-era volume backups):\n' >&2
    while IFS= read -r line; do printf '  %s\n' "$line" >&2; done < "$NOT_REC_FILE"
  fi
  if [ "$FAILED" -gt 0 ]; then
    printf 'FAILED uploads:\n' >&2
    while IFS= read -r line; do printf '  %s\n' "$line" >&2; done < "$FAILED_FILE"
  fi
  exit 1
fi
exit 0
