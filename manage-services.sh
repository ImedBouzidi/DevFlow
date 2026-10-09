#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# manage-services.sh — Menu to manage DevFlow services (profile=local)
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

# ── Colors ────────────────────────────────────────────────────────────────────
RESET="\033[0m"
BOLD="\033[1m"
DIM="\033[2m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
MAGENTA="\033[35m"
CYAN="\033[36m"
WHITE="\033[37m"
BG_BLUE="\033[44m"
BG_GREEN="\033[42m"
BG_RED="\033[41m"

# name : kind : module : port   (kind: spring | python | keycloak | angular)
SERVICES=(
  "frontend:angular:frontend:4200"
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
    echo "  ${YELLOW}[!]${RESET} $name already running (pid $(cat "$(pid_file "$name")"))"
    return
  fi
  echo "  ${CYAN}[*]${RESET} Starting $name (port $port) ..."
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
    angular)
      cd "$ROOT_DIR/$module"
      nohup npx ng serve --proxy-config proxy.conf.json > "$(log_file "$name")" 2>&1 &
      cd "$ROOT_DIR"
      ;;
  esac
  echo $! > "$(pid_file "$name")"
  echo "  ${GREEN}[+]${RESET} $name started (pid $!) — log: logs/$name.log"
}

stop_service() {
  local name="$1" kind="${2:-}" module="${3:-}" port="${4:-}"
  if is_running "$name"; then
    local pid
    pid="$(cat "$(pid_file "$name")")"
    echo "  ${CYAN}[*]${RESET} Stopping $name (pid $pid) ..."
    kill "$pid" 2>/dev/null
    case "$kind" in
      spring)   [ -n "$module" ] && pkill -f "spring-boot:run.*$module" 2>/dev/null ;;
      keycloak) pkill -f "kc.sh start-dev" 2>/dev/null; pkill -f "keycloak-21.1.1" 2>/dev/null ;;
      python)   pkill -f "ai-analysis-server.*wsgi.py" 2>/dev/null; pkill -f "wsgi.py" 2>/dev/null ;;
      angular)  pkill -f "ng serve" 2>/dev/null ;;
    esac
    # kill the forked process listening on its port
    if [ -n "$port" ]; then
      local jpid
      jpid="$(lsof -ti :"$port" 2>/dev/null || fuser "$port"/tcp 2>/dev/null)"
      [ -n "$jpid" ] && kill $jpid 2>/dev/null
    fi
    sleep 2
    kill -9 "$pid" 2>/dev/null
    rm -f "$(pid_file "$name")"
    echo "  ${GREEN}[+]${RESET} $name stopped"
  else
    echo "  ${YELLOW}[!]${RESET} $name is not running"
    rm -f "$(pid_file "$name")"
  fi
}

status_services() {
  echo
  printf "  ${BOLD}%-25s %-8s %-10s %-8s${RESET}\n" "SERVICE" "PORT" "STATUS" "PID"
  printf "  ${DIM}%-25s %-8s %-10s %-8s${RESET}\n" "─────────────────────────" "────────" "──────────" "────────"
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name kind module port <<< "$entry"
    if is_running "$name"; then
      printf "  %-25s %-8s ${GREEN}%-10s${RESET} %s\n" "$name" "$port" "RUNNING" "$(cat "$(pid_file "$name")")"
    else
      printf "  %-25s %-8s ${RED}%-10s${RESET} %s\n" "$name" "$port" "STOPPED" "-"
    fi
  done
  echo
}

select_service() {
  echo
  local i=1
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name kind _ port <<< "$entry"
    local icon
    case "$kind" in
      spring)   icon="${BLUE}◆${RESET}" ;;
      python)   icon="${YELLOW}◆${RESET}" ;;
      keycloak) icon="${MAGENTA}◆${RESET}" ;;
      angular)  icon="${CYAN}◆${RESET}" ;;
    esac
    printf "  ${BOLD}%2d)${RESET} %s %s\n" "$i" "$icon" "$name"
    i=$((i + 1))
  done
  echo "  ${BOLD} a)${RESET} ${BOLD}all${RESET}"
  echo " ────────────────────────────────────────"
  read -rp "  Choice: " CH
  if [ "$CH" = "a" ]; then
    SELECTED="all"
  elif [[ "$CH" =~ ^[0-9]+$ ]] && [ "$CH" -ge 1 ] && [ "$CH" -le ${#SERVICES[@]} ]; then
    SELECTED="${SERVICES[$((CH - 1))]}"
  else
    SELECTED=""
    echo "  ${RED}[!] Invalid choice${RESET}"
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
      echo "  ${BOLD}===== $name =====${RESET}"
      tail -n 15 "$(log_file "$name")" 2>/dev/null || echo "  (no log yet)"
    done
  else
    IFS=: read -r name kind _ port <<< "$SELECTED"
    tail -n 50 -f "$(log_file "$name")" 2>/dev/null || echo "  (no log yet)"
  fi
}

build_frontend() {
  echo "  ${CYAN}[*]${RESET} Building frontend ..."
  cd "$ROOT_DIR/frontend"
  npx ng build 2>&1
  local rc=$?
  cd "$ROOT_DIR"
  if [ $rc -eq 0 ]; then
    echo "  ${GREEN}[+]${RESET} Frontend build successful — output: frontend/dist/"
  else
    echo "  ${RED}[✗]${RESET} Frontend build failed"
  fi
}

open_browser() {
  local url="http://localhost:4200"
  echo "  ${CYAN}[*]${RESET} Opening $url ..."
  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" &>/dev/null &
  elif command -v open &>/dev/null; then
    open "$url" &>/dev/null &
  else
    echo "  ${YELLOW}[!]${RESET} Could not detect browser opener. Visit $url manually."
  fi
}

# ── Main Menu ─────────────────────────────────────────────────────────────────
while true; do
  clear
  echo
  echo "  ${BOLD}${BG_BLUE}${WHITE} ╔══════════════════════════════════════════════════╗ ${RESET}"
  echo "  ${BOLD}${BG_BLUE}${WHITE} ║          DevFlow Services Manager (local)         ║ ${RESET}"
  echo "  ${BOLD}${BG_BLUE}${WHITE} ╚══════════════════════════════════════════════════╝ ${RESET}"
  echo
  echo "  ${BOLD}┌─ Service Control ─────────────────────────────────┐${RESET}"
  echo "  ${BOLD}│${RESET}  ${GREEN}1)${RESET} Status          ${DIM}— show all service states${RESET}     ${BOLD}│${RESET}"
  echo "  ${BOLD}│${RESET}  ${GREEN}2)${RESET} Start           ${DIM}— start service(s)${RESET}               ${BOLD}│${RESET}"
  echo "  ${BOLD}│${RESET}  ${GREEN}3)${RESET} Stop            ${DIM}— stop service(s)${RESET}                ${BOLD}│${RESET}"
  echo "  ${BOLD}│${RESET}  ${GREEN}4)${RESET} Restart         ${DIM}— restart service(s)${RESET}              ${BOLD}│${RESET}"
  echo "  ${BOLD}└──────────────────────────────────────────────────┘${RESET}"
  echo
  echo "  ${BOLD}┌─ Logs & Build ────────────────────────────────────┐${RESET}"
  echo "  ${BOLD}│${RESET}  ${CYAN}5)${RESET} View logs       ${DIM}— tail service logs${RESET}            ${BOLD}│${RESET}"
  echo "  ${BOLD}│${RESET}  ${CYAN}6)${RESET} Build frontend  ${DIM}— ng build (production)${RESET}        ${BOLD}│${RESET}"
  echo "  ${BOLD}│${RESET}  ${CYAN}7)${RESET} Open in browser ${DIM}— launch frontend at :4200${RESET}       ${BOLD}│${RESET}"
  echo "  ${BOLD}└──────────────────────────────────────────────────┘${RESET}"
  echo
  echo "  ${BOLD}┌─ System ─────────────────────────────────────────┐${RESET}"
  echo "  ${BOLD}│${RESET}  ${RED}8)${RESET} Quit            ${DIM}— exit the manager${RESET}              ${BOLD}│${RESET}"
  echo "  ${BOLD}└──────────────────────────────────────────────────┘${RESET}"
  echo
  read -rp "  ${BOLD}Choose option:${RESET} " OPT
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
    6) build_frontend ;;
    7) open_browser ;;
    8)
      echo
      echo "  ${BOLD}${GREEN}  ✓ Goodbye!${RESET}"
      echo
      exit 0
      ;;
    *)
      echo "  ${RED}[!] Invalid option — try again${RESET}"
      ;;
  esac
  echo
  read -rp "  ${DIM}Press Enter to continue...${RESET}" _
done
