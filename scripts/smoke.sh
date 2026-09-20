#!/usr/bin/env bash
# Looks at a live site from the outside. Usage: scripts/smoke.sh https://address [--production]
# Exit code 0 only when every check passes. Nothing is changed on the site: only reads and refused requests.
set -u
url="${1:?Usage: scripts/smoke.sh https://address [--production]}"
url="${url%/}"
production=false
[ "${2:-}" = "--production" ] && production=true
bad=0
ok()   { printf '  ok    %s\n' "$1"; }
nope() { printf '  FAIL  %s\n' "$1"; bad=$((bad + 1)); }
check() { if eval "$2"; then ok "$1"; else nope "$1"; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
header() { curl -sI "$1" | tr -d '\r' | grep -i "^$2:" | head -1; }

echo "Checking $url"
check "the health check answers and the database is ok" "curl -fsS '$url/api/health' | grep -q '\"database\":\"ok\"'"
check "the web page has a Content-Security-Policy" "[ -n \"\$(header '$url/' content-security-policy)\" ]"
check "the web page forbids inline styles and scripts" "! header '$url/' content-security-policy | grep -q \"unsafe-inline\\|unsafe-eval\""
check "the API sends Strict-Transport-Security" "[ -n \"\$(header '$url/api/health' strict-transport-security)\" ]"
check "the API answers are never cached" "header '$url/api/health' cache-control | grep -qi 'no-store'"
check "the API answers are not framed or sniffed" "header '$url/api/health' x-content-type-options | grep -qi nosniff"
check "nothing private without signing in (me, courses, students, receipts)" "for p in me courses students 'invoices?period=2026-01' my/work notifications payment-details; do [ \"\$(code \"$url/api/\$p\")\" = 401 ] || exit 1; done"
check "a change without the app's header is refused" "[ \"\$(code -X POST '$url/api/auth/sign-out')\" = 403 ]"
check "a change from another site is refused" "[ \"\$(code -X POST -H 'Origin: https://evil.example' -H 'x-lms-client: web' '$url/api/auth/sign-out')\" = 403 ]"
check "another site is not allowed to read the API (no CORS)" "! curl -sI -X OPTIONS -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: POST' '$url/api/courses' | grep -qi '^access-control-allow'"
check "a very big request is refused" "[ \"\$(head -c 700000 /dev/zero | tr '\\0' x | curl -s -o /dev/null -w '%{http_code}' -X POST -H 'x-lms-client: web' -H 'content-type: application/json' --data-binary @- '$url/api/auth/sign-in-link/request')\" = 413 ]"
check "no source maps are published" "[ \"\$(code '$url/assets/index.js.map')\" != 200 ] || curl -s '$url/assets/index.js.map' | head -c 1 | grep -qv '{'"
if $production; then
  check "the description of the API is hidden" "[ \"\$(code '$url/api/openapi.json')\" = 404 ]"
  check "the outbox of test emails is hidden" "[ \"\$(code '$url/api/dev/outbox')\" = 404 ]"
  check "the address uses https" "case '$url' in https://*) true;; *) false;; esac"
fi
if [ "$bad" -gt 0 ]; then printf '\n%s check(s) failed.\n' "$bad"; exit 1; fi
printf '\nAll checks passed.\n'
