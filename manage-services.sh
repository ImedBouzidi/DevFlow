#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  manage-services.sh — Menu to manage DevFlow services (profile=local)
#
#  Interactive TUI for starting, stopping, restarting and inspecting the
#  local service stack. All state is tracked via PID files under ./.pids
#  and output logs under ./logs.
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

# ── Colors ────────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  RESET=$'\033[0m';  BOLD=$'\033[1m';   DIM=$'\033[2m'
  RED=$'\033[31m';   GREEN=$'\033[32m'; YELLOW=$'\033[33m'
  BLUE=$'\033[34m';  MAGENTA=$'\033[35m'; CYAN=$'\033[36m'
  WHITE=$'\033[37m'
  BG_BLUE=$'\033[44m'
else
  RESET=""; BOLD=""; DIM=""
  RED=""; GREEN=""; YELLOW=""
  BLUE=""; MAGENTA=""; CYAN=""
  WHITE=""
  BG_BLUE=""
fi

# ── Symbols ───────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  ICON_OK="✔"        # success
  ICON_FAIL="✘"      # failure
  ICON_WARN="▲"      # warning
  ICON_INFO="•"      # info
  ICON_ARROW="❯"    # menu pointer
  ICON_DOT_R="●"     # running dot
  ICON_DOT_S="○"     # stopped dot
  BOX_H="─" BOX_V="│" BOX_TL="╭" BOX_TR="╮" BOX_BL="╰" BOX_BR="╯"
else
  ICON_OK="+"; ICON_FAIL="x"; ICON_WARN="!"; ICON_INFO="-"
  ICON_ARROW=">"; ICON_DOT_R="*"; ICON_DOT_S="."
  BOX_H="-"; BOX_V="|"; BOX_TL="+"; BOX_TR="+"; BOX_BL="+"; BOX_BR="+"
fi

# ── Messaging helpers ─────────────────────────────────────────────────────────
ok()   { printf "  %s%s%s %s\n" "$GREEN" "$ICON_OK" "$RESET" "$*"; }
warn() { printf "  %s%s%s %s\n" "$YELLOW" "$ICON_WARN" "$RESET" "$*"; }
err()  { printf "  %s%s%s %s\n" "$RED" "$ICON_FAIL" "$RESET" "$*" >&2; }
step() { printf "  %s%s%s %s%s%s\n" "$CYAN" "$ICON_ARROW" "$RESET" "$BOLD" "$*" "$RESET"; }

# Repeat a character N times (portable, no seq dependency noise)
rep() { local c="$1" n="$2" out=""; while [ ${#out} -lt "$n" ]; do out="$out$c"; done; printf '%s' "$out"; }

# Total visible width of the status table body: 2 + 1 + 1 + 25+6 + 1 + 13 + 1 + 9
TABLE_W=60

# Length of a string ignoring ANSI escape sequences (so colored text still aligns)
visible_len() {
  local s="$1"
  s="$(printf '%s' "$s" | sed $'s/\033\\[[0-9;]*m//g')"
  printf '%s' "${#s}"
}

# Left-align text to a visible width, ANSI-aware
pad() {
  local text="$1" width="$2" len diff
  len="$(visible_len "$text")"
  printf '%s' "$text"
  if [ "$len" -lt "$width" ]; then
    diff=$((width - len))
    printf '%*s' "$diff" ''
  fi
}

# Right-align text to a visible width, ANSI-aware
rpad() {
  local text="$1" width="$2" len diff
  len="$(visible_len "$text")"
  if [ "$len" -lt "$width" ]; then
    diff=$((width - len))
    printf '%*s' "$diff" ''
  fi
  printf '%s' "$text"
}

# Center text within a visible width, ANSI-aware
pad_center() {
  local text="$1" width="$2" len left right
  len="$(visible_len "$text")"
  left=$(( (width - len) / 2 ))
  right=$(( width - len - left ))
  printf '%s%s%s' "$(rep " " "$left")" "$text" "$(rep " " "$right")"
}

# ── Services ──────────────────────────────────────────────────────────────────
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

# Glyph per service kind, with an ASCII fallback for non-TTY / NO_COLOR output
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  GLYPH_SPRING="◆"; GLYPH_PYTHON="▲"
  GLYPH_KEYCLOAK="⬢"; GLYPH_ANGULAR="◉"; GLYPH_OTHER="◇"
else
  GLYPH_SPRING="+"; GLYPH_PYTHON="^"
  GLYPH_KEYCLOAK="K"; GLYPH_ANGULAR="@"; GLYPH_OTHER="-"
fi

kind_icon() {
  case "$1" in
    spring)   printf '%s%s%s' "$BLUE"    "$GLYPH_SPRING"   "$RESET" ;;
    python)   printf '%s%s%s' "$YELLOW"  "$GLYPH_PYTHON"   "$RESET" ;;
    keycloak) printf '%s%s%s' "$MAGENTA" "$GLYPH_KEYCLOAK" "$RESET" ;;
    angular)  printf '%s%s%s' "$CYAN"    "$GLYPH_ANGULAR"  "$RESET" ;;
    *)        printf '%s%s%s' "$WHITE"   "$GLYPH_OTHER"    "$RESET" ;;
  esac
}

pid_file() { echo "$PID_DIR/$1.pid"; }
log_file() { echo "$LOG_DIR/$1.log"; }

is_running() {
  local pf
  pf="$(pid_file "$1")"
  [ -f "$pf" ] && kill -0 "$(cat "$pf")" 2>/dev/null
}

# ── Service actions ───────────────────────────────────────────────────────────
start_service() {
  local name="$1" kind="$2" module="$3" port="$4"
  if is_running "$name"; then
    warn "$name already running ${DIM}(pid $(cat "$(pid_file "$name")"))${RESET}"
    return
  fi
  step "Starting ${BOLD}$name${RESET} ${DIM}· port $port${RESET}"
  cd "$ROOT_DIR" || return
  case "$kind" in
    spring)
      SPRING_PROFILES_ACTIVE=local nohup mvn -q -pl "$module" spring-boot:run \
        -Dspring-boot.run.profiles=local > "$(log_file "$name")" 2>&1 &
      ;;
    python)
      cd "$ROOT_DIR/$module" || return
      nohup .venv/bin/python wsgi.py > "$(log_file "$name")" 2>&1 &
      cd "$ROOT_DIR"
      ;;
    keycloak)
      nohup "$ROOT_DIR/$module/bin/kc.sh" start-dev --http-port="$port" > "$(log_file "$name")" 2>&1 &
      ;;
    angular)
      cd "$ROOT_DIR/$module" || return
      nohup npx ng serve --proxy-config proxy.conf.json > "$(log_file "$name")" 2>&1 &
      cd "$ROOT_DIR"
      ;;
  esac
  echo $! > "$(pid_file "$name")"
  ok "$name started ${DIM}(pid $!)${RESET} ${DIM}→ logs/$name.log${RESET}"
}

stop_service() {
  local name="$1" kind="${2:-}" module="${3:-}" port="${4:-}"
  if is_running "$name"; then
    local pid
    pid="$(cat "$(pid_file "$name")")"
    step "Stopping ${BOLD}$name${RESET} ${DIM}· pid $pid${RESET}"
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
    ok "$name stopped"
  else
    warn "$name is not running"
    rm -f "$(pid_file "$name")"
  fi
}

status_services() {
  local name kind module port entry total=0 active=0 state state_c meta
  local row1 row2 row3 row4

  printf '\n'
  printf '  %s%s%s\n' "$BOLD" "SERVICE STATUS" "$RESET"
  printf '  %s%s%s\n' "$DIM" "$(rep "$BOX_H" "$TABLE_W")" "$RESET"

  row1="$DIM$(rpad " " 2)$RESET"
  row2="$BOLD  $(pad "SERVICE" 25)$(rpad "PORT" 6)$RESET"
  row3="$BOLD$(pad "  STATE" 13)$RESET"
  row4="$DIM$(pad " PID / LOG" 10)"
  printf '  %s %s %s %s\n' "$row1" "$row2" "$row3" "$row4"

  printf '  %s%s%s\n' "$DIM" "$(rep "$BOX_H" "$TABLE_W")" "$RESET"

  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name kind module port <<< "$entry"
    total=$((total + 1))
    if is_running "$name"; then
      active=$((active + 1))
      state_c="$GREEN"; state="$ICON_DOT_R RUNNING"
      meta="$(cat "$(pid_file "$name")" 2>/dev/null || echo "?")"
    else
      state_c="$RED"; state="$ICON_DOT_S STOPPED"
      meta="logs/$name.log"
    fi

    row1="$DIM$(rpad "$((total))" 2)$RESET"
    row2="$(kind_icon "$kind") $(pad "$name" 25)$(rpad "$port" 6)$RESET"
    row3="$state_c$(pad "$state" 13)$RESET"
    row4="$DIM $meta"
    printf '  %s %s %s %s\n' "$row1" "$row2" "$row3" "$row4"
  done

  printf '  %s%s%s\n' "$DIM" "$(rep "$BOX_H" "$TABLE_W")" "$RESET"

  if [ "$active" -eq "$total" ]; then
    state_c="$GREEN"; state="$ICON_OK"
  elif [ "$active" -eq 0 ]; then
    state_c="$RED"; state="$ICON_FAIL"
  else
    state_c="$YELLOW"; state="$ICON_WARN"
  fi
  printf '  %s%s%s %s%d/%d services online%s\n\n' \
    "$state_c" "$state" "$RESET" "$BOLD" "$active" "$total" "$RESET"
}

select_service() {
  local name kind module port entry i=1 running
  printf '\n'
  for entry in "${SERVICES[@]}"; do
    IFS=: read -r name kind module port <<< "$entry"
    if is_running "$name"; then
      running="$GREEN$ICON_DOT_R$RESET"
    else
      running="$DIM$ICON_DOT_S$RESET"
    fi
    printf '    %s%s%s) %s %s %s%s%s  %s%s%s\n' \
      "$BOLD" "$i" "$RESET" "$running" "$(kind_icon "$kind")" \
      "$(pad "$name" 26)" "$RESET" "$DIM" "$(rpad "$port" 6)" "$RESET"
    i=$((i + 1))
  done
  printf '    %s%s%s) %s %s %s%s%s\n' \
    "$BOLD" "a" "$RESET" "$YELLOW$ICON_ARROW" "$RESET" \
    "$BOLD$(pad "all services" 26)$RESET"
  printf '  %s%s%s\n\n' "$DIM" "$(rep "$BOX_H" 40)" "$RESET"
  read -rp "  ${BOLD}${ICON_ARROW}${RESET} Choice: " CH
  if [ "$CH" = "a" ]; then
    SELECTED="all"
  elif [[ "$CH" =~ ^[0-9]+$ ]] && [ "$CH" -ge 1 ] && [ "$CH" -le ${#SERVICES[@]} ]; then
    SELECTED="${SERVICES[$((CH - 1))]}"
  else
    SELECTED=""
    err "Invalid choice"
  fi
}

for_each_or_selected() {
  local action="$1"
  select_service
  [ -z "${SELECTED:-}" ] && return
  printf '\n'
  if [ "$SELECTED" = "all" ]; then
    for entry in "${SERVICES[@]}"; do
      IFS=: read -r name kind module port <<< "$entry"
      "$action" "$name" "$kind" "$module" "$port"
    done
  else
    IFS=: read -r name kind module port <<< "$SELECTED"
    "$action" "$name" "$kind" "$module" "$port"
  fi
  printf '\n'
}

restart_service() {
  select_service
  [ -z "${SELECTED:-}" ] && return
  printf '\n'
  if [ "$SELECTED" = "all" ]; then
    for entry in "${SERVICES[@]}"; do
      IFS=: read -r n k m p <<< "$entry"
      stop_service "$n" "$k" "$m" "$p"
    done
    sleep 1
    for entry in "${SERVICES[@]}"; do
      IFS=: read -r n k m p <<< "$entry"
      start_service "$n" "$k" "$m" "$p"
    done
  else
    IFS=: read -r n k m p <<< "$SELECTED"
    stop_service "$n" "$k" "$m" "$p"
    sleep 1
    start_service "$n" "$k" "$m" "$p"
  fi
  printf '\n'
}

show_logs() {
  select_service
  [ -z "${SELECTED:-}" ] && return
  if [ "$SELECTED" = "all" ]; then
    local name kind module port
    for entry in "${SERVICES[@]}"; do
      IFS=: read -r name kind module port <<< "$entry"
      printf '\n  %s%s %s%s\n' "$BG_BLUE" "$WHITE" "$name" "$RESET"
      tail -n 15 "$(log_file "$name")" 2>/dev/null || printf '  %s(no log yet)%s\n' "$DIM" "$RESET"
    done
    printf '\n'
  else
    local name kind module port
    IFS=: read -r name kind module port <<< "$SELECTED"
    step "Streaming ${BOLD}$name${RESET} ${DIM}· Ctrl-C to stop${RESET}"
    printf '\n'
    tail -n 50 -f "$(log_file "$name")" 2>/dev/null || warn "No log yet for $name"
  fi
}

build_frontend() {
  printf '\n'
  step "Building frontend ${DIM}· ng build (production)${RESET}"
  cd "$ROOT_DIR/frontend" || { err "frontend/ not found"; return; }
  npx ng build 2>&1
  local rc=$?
  cd "$ROOT_DIR"
  if [ $rc -eq 0 ]; then
    ok "Frontend build successful ${DIM}→ frontend/dist/${RESET}"
  else
    err "Frontend build failed"
  fi
  printf '\n'
}

open_browser() {
  local url="http://localhost:4200"
  step "Opening ${BOLD}$url${RESET}"
  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" &>/dev/null &
  elif command -v open &>/dev/null; then
    open "$url" &>/dev/null &
  else
    warn "No browser opener detected — visit $url manually"
  fi
  printf '\n'
}

# ── Banner ────────────────────────────────────────────────────────────────────
banner() {
  local width=60
  local title="DevFlow Services Manager"
  local subtitle="local profile"
  local inner=$((width - 2))
  local line
  line="$(rep "$BOX_H" "$inner")"

  printf '\n'
  printf '  %s%s%s%s%s\n' "$BOLD$BG_BLUE$WHITE" "$BOX_TL" "$line" "$BOX_TR" "$RESET"
  printf '  %s%s%s%s%s\n' "$BOLD$BG_BLUE$WHITE" "$BOX_V" "$(pad_center "$title" "$inner")" "$BOX_V" "$RESET"
  printf '  %s%s%s%s%s\n' "$BG_BLUE$WHITE"    "$BOX_V" "$(pad_center "$subtitle" "$inner")" "$BOX_V" "$RESET"
  printf '  %s%s%s%s%s\n' "$BOLD$BG_BLUE$WHITE" "$BOX_BL" "$line" "$BOX_BR" "$RESET"
  printf '\n'
}

# ── Menu item helper ──────────────────────────────────────────────────────────
menu_item() {
  local key="$1" label="$2" desc="$3" color="$4"
  printf '   %s%s%s %s  %s%s%s\n' \
    "$color" "$key" "$RESET" "$(pad "$label" 17)" \
    "$DIM" "$desc" "$RESET"
}

section() {
  local title="$1" rule
  rule="$(rep "$BOX_H" $((46 - ${#title})))"
  printf '\n  %s%s%s %s%s%s %s%s%s\n\n' \
    "$DIM" "$BOX_H" "$RESET" "$BOLD" "$title" "$RESET" "$DIM" "$rule" "$RESET"
}

# ── Main Menu ─────────────────────────────────────────────────────────────────
while true; do
  clear 2>/dev/null || true
  banner

  section "Service Control"
  menu_item "1)" "Status"          "show all service states"        "$GREEN"
  menu_item "2)" "Start"           "start service(s)"               "$GREEN"
  menu_item "3)" "Stop"            "stop service(s)"                "$GREEN"
  menu_item "4)" "Restart"         "restart service(s)"             "$GREEN"

  section "Logs & Build"
  menu_item "5)" "View logs"       "tail service logs"              "$CYAN"
  menu_item "6)" "Build frontend"  "ng build (production)"          "$CYAN"
  menu_item "7)" "Open browser"    "launch frontend at :4200"       "$CYAN"

  section "System"
  menu_item "8)" "Quit"            "exit the manager"               "$RED"
  printf '\n'

  read -rp "  ${BOLD}${ICON_ARROW}${RESET} Choose an option: " OPT
  printf '\n'
  case "$OPT" in
    1) status_services ;;
    2) for_each_or_selected start_service ;;
    3) for_each_or_selected stop_service ;;
    4) restart_service ;;
    5) show_logs ;;
    6) build_frontend ;;
    7) open_browser ;;
    8)
      printf '\n  %s%s%s %s%s%s\n\n' "$BOLD" "$GREEN" "$ICON_OK" "$BOLD" "Goodbye!" "$RESET"
      exit 0
      ;;
    "")
      printf '  %s%s%s %s\n' "$DIM" "$ICON_INFO" "$RESET" "Nothing selected."
      ;;
    *)
      err "Invalid option ${BOLD}$OPT${RESET} — press a number between 1 and 8"
      ;;
  esac
  read -rp "  ${DIM}${BOX_H} Press Enter to continue...${RESET}" _
done
