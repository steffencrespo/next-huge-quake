#!/bin/sh
# Manual, on-demand session helper (no background service, nothing runs unless you ask).
#   sh scripts/session.sh start         start the Docker services Temporal needs (Docker Desktop must be open)
#   sh scripts/session.sh worker        run the host worker in this terminal (Ctrl-C stops it); one worker at a time
#   sh scripts/session.sh status        Docker services, worker and API
#   sh scripts/session.sh produce <id>  start quake_video for an approved event (SPENDS: Anthropic and one ElevenLabs request)
#   sh scripts/session.sh result <id>   show the workflow's result
#   sh scripts/session.sh stop          stop the worker and this project's Docker services (data and volumes are kept)
set -eu
cd "$(dirname "$0")/.."
ROOT=$(pwd)
COMPOSE=node_modules/@outputai/cli/dist/assets/docker/docker-compose-dev.yml
API=${OUTPUT_API_URL:-http://localhost:3001}
WORKER_PATTERN="$ROOT/node_modules/@outputai/core/src/worker/index.js"
dc() { docker compose -f "$COMPOSE" --project-directory . --env-file .env "$@"; }
worker_running() { pgrep -f "$WORKER_PATTERN" >/dev/null 2>&1; }
api_up() { curl -s -o /dev/null --max-time 3 "$API/health"; }

case "${1:-}" in
  start)
    docker info >/dev/null 2>&1 || { echo "Docker is not running. Open Docker Desktop first." >&2; exit 1; }
    dc up -d redis postgresql temporal temporal-ui
    dc up -d --no-deps api
    i=0; until api_up; do i=$((i+1)); [ $i -ge 30 ] && { echo "API did not answer at $API" >&2; exit 1; }; sleep 2; done
    echo "Services are up. Next: sh scripts/session.sh worker (in its own terminal)."
    ;;
  worker)
    api_up || { echo "API is not answering: run 'sh scripts/session.sh start' first." >&2; exit 1; }
    worker_running && { echo "A worker for this project is already running; not starting another." >&2; exit 1; }
    exec npm run output:worker:host
    ;;
  status)
    docker info >/dev/null 2>&1 && dc ps --format '{{.Service}} {{.Status}}' || echo "Docker is not running"
    if worker_running; then echo "worker: running"; else echo "worker: not running"; fi
    if api_up; then echo "api: up"; else echo "api: down"; fi
    ;;
  produce)
    id=${2:?usage: session.sh produce <usgs-event-id>}
    case "$id" in *[!a-z0-9]*|"") echo "not a USGS event ID: $id" >&2; exit 1;; esac
    if [ -e "../video/out/packages/$id" ]; then echo "$id already has output in video/out/packages; refusing to overwrite it." >&2; exit 1; fi
    api_up || { echo "API is not answering: run 'sh scripts/session.sh start' first." >&2; exit 1; }
    worker_running || { echo "No worker is running: start one with 'sh scripts/session.sh worker'." >&2; exit 1; }
    echo "Starting quake_video for $id (paid: Anthropic requests and one ElevenLabs request)."
    curl -s "$API/workflow/start" -H 'content-type: application/json' \
      -d "{\"workflowName\":\"quake_video\",\"workflowId\":\"quake_video-$id\",\"input\":{\"eventId\":\"$id\",\"asOfUtc\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}}"
    echo
    echo "Follow it with: sh scripts/session.sh result $id   (takes about 4-5 minutes; the video is NOT published)"
    ;;
  result)
    exec npx output workflow result "quake_video-${2:?usage: session.sh result <usgs-event-id>}"
    ;;
  stop)
    if worker_running; then pkill -TERM -f "$WORKER_PATTERN" || true; echo "worker: stopping"; sleep 3; else echo "worker: not running"; fi
    docker info >/dev/null 2>&1 && dc stop || true
    ;;
  *)
    sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
    [ -z "${1:-}" ] || exit 2
    ;;
esac
