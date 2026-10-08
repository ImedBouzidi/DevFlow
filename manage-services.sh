#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# manage-services.sh — Menu to manage DevFlow Spring Boot services (profile=local)
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

# name : kind : module : port   (kind: spring | python | keycloak)
SERVICES=(
  "discovery-server:spring:discovery-server:8761"
  "api-gateway:spring:api-gateway:9090"
  "auth-register-service:spring:auth-register-service:8082"
  "incident-service:spring:incident-service:8083"
  "ai-analysis-server:python:ai-analysis-server:5000"
  "keycloak:keycloak:keycloak-21.1.1:9091"
)

pid_file() { echo "$PID_DIR/$1.pid"; }
log_file() { echo "$LOG_DIR/$1.log"; }

is_running() {
  local pf
  pf="$(pid_file "$1")"
  [ -f "$pf" ] && kill -0 "$(cat "$pf")" 2>/dev/null
}

start_service() {
  local name="$1" kind="$2" module="$3" port="$4"
  if is_running "$name"; then
    echo "  [!] $name already running (pid $(cat "$(pid_file "$name")"))"
    return
  fi
  echo "  [*] Starting $name (port $port) ..."
  cd "$ROOT_DIR"
  case "$kind" in
    spring)
      SPRING_PROFILES_ACTIVE=local nohup mvn -q -pl "$module" spring-boot:run \
        -Dspring-boot.run.profiles=local > "$(log_file "$name")" 2>&1 &
      ;;
    python)
      cd "$ROOT_DIR/$module"
      nohup .venv/bin/python wsgi.py > "$(log_file "$name")" 2>&1 &
      cd "$ROOT_DIR"
      ;;
    keycloak)
      nohup "$ROOT_DIR/$module/bin/kc.sh" start-dev --http-port=$port > "$(log_file "$name")" 2>&1 &
      ;;
  esac
  echo $! > "$(pid_file "$name")"
  echo "  [+] $name started (pid $!) — log: logs/$name.log"
}

stop_service() {
  local name="$1" kind="${2:-}" module="${3:-}" port="${4:-}"
  if is_running "$name"; then
    local pid
    pid="$(cat "$(pid_file "$name")")"
    echo "  [*] Stopping $name (pid $pid) ..."
    kill "$pid" 2>/dev/null
    case "$kind" in
      spring)   [ -n "$module" ] && pkill -f "spring-boot:run.*$module" 2>/dev/null ;;
      keycloak) pkill -f "kc.sh start-dev" 2>/dev/null; pkill -f "keycloak-21.1.1" 2>/dev/null ;;
      python)   pkill -f "ai-analysis-server.*wsgi.py" 2>/dev/null; pkill -f "wsgi.py" 2>/dev/null ;;
    esac
    # kill the forked java process listening on its port
    if [ -n "$port" ]; then
      local jpid
      jpid="$(lsof -ti :"$port" 2>/dev/null || fuser "$port"/tcp 2>/dev/null)"
      [ -n "$jpid" ] && kill $jpid 2>/dev/null
    fi
    sleep 2
    kill -9 "$pid" 2>/dev/null
    rm -f "$(pid_file "$name")"
    echo "  [+] $name stopped"
  else
    echo "  [!] $name is not running"
    rm -f "$(pid_file "$name")"
  fi
}

status_services() {
  printf "\n  %-25s %-8s %-8s %s\n" "SERVICE" "PORT" "STATUS" "PID"
  printf "  %-25s %-8s %-8s %s\n" "-------" "----" "------" "---"
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name kind module port <<< "$entry"
    if is_running "$name"; then
      printf "  %-25s %-8s \033[32m%-8s\033[0m %s\n" "$name" "$port" "RUNNING" "$(cat "$(pid_file "$name")")"
    else
      printf "  %-25s %-8s \033[31m%-8s\033[0m %s\n" "$name" "$port" "STOPPED" "-"
    fi
  done
  echo
}

select_service() {
  echo
  local i=1
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name kind _ port <<< "$entry"
    echo "  $i) $name"
    i=$((i + 1))
  done
  echo "  a) all"
  read -rp "  Choice: " CH
  if [ "$CH" = "a" ]; then
    SELECTED="all"
  elif [[ "$CH" =~ ^[0-9]+$ ]] && [ "$CH" -ge 1 ] && [ "$CH" -le ${#SERVICES[@]} ]; then
    SELECTED="${SERVICES[$((CH - 1))]}"
  else
    SELECTED=""
    echo "  [!] Invalid choice"
  fi
}

for_each_or_selected() {
  local action="$1"
  select_service
  [ -z "${SELECTED:-}" ] && return
  if [ "$SELECTED" = "all" ]; then
    for entry in "${SERVICES[@]}"; do
      IFS=: read -r name kind module port <<< "$entry"
      "$action" "$name" "$kind" "$module" "$port"
    done
  else
    IFS=: read -r name kind module port <<< "$SELECTED"
    "$action" "$name" "$kind" "$module" "$port"
  fi
}

show_logs() {
  select_service
  [ -z "${SELECTED:-}" ] && return
  if [ "$SELECTED" = "all" ]; then
    for entry in "${SERVICES[@]}"; do
      IFS=: read -r name kind _ port <<< "$entry"
      echo "===== $name ====="
      tail -n 15 "$(log_file "$name")" 2>/dev/null || echo "  (no log yet)"
    done
  else
    IFS=: read -r name kind _ port <<< "$SELECTED"
    tail -n 50 -f "$(log_file "$name")" 2>/dev/null || echo "  (no log yet)"
  fi
}

while true; do
  echo "════════════════════════════════════════"
  echo "   DevFlow Services Manager (local)"
  echo "════════════════════════════════════════"
  echo "  1) Status"
  echo "  2) Start"
  echo "  3) Stop"
  echo "  4) Restart"
  echo "  5) View logs"
  echo "  6) Quit"
  echo "────────────────────────────────────────"
  read -rp "  Choose: " OPT
  case "$OPT" in
    1) status_services ;;
    2) for_each_or_selected start_service ;;
    3) for_each_or_selected stop_service ;;
    4)
      select_service
      SEL="${SELECTED:-}"
      if [ -n "$SEL" ]; then
        if [ "$SEL" = "all" ]; then
          for entry in "${SERVICES[@]}"; do
            IFS=: read -r n k m p <<< "$entry"; stop_service "$n" "$k" "$m" "$p"
          done
          sleep 1
          for entry in "${SERVICES[@]}"; do
            IFS=: read -r n k m p <<< "$entry"; start_service "$n" "$k" "$m" "$p"
          done
        else
          IFS=: read -r n k m p <<< "$SEL"
          stop_service "$n" "$k" "$m" "$p"
          sleep 1
          start_service "$n" "$k" "$m" "$p"
        fi
      fi
      ;;
    5) show_logs ;;
    6) echo "Bye!"; exit 0 ;;
    *) echo "  [!] Invalid option" ;;
  esac
  echo
done
