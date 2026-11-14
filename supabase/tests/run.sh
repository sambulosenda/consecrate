#!/usr/bin/env bash
# Runs the migrations and the access-rule tests against a throwaway local
# Postgres. Needs the Postgres server binaries (initdb, pg_ctl) on the machine;
# no Supabase project or Docker required.
#
#   npm run test:db
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"

bindir="${PG_BINDIR:-}"
if [ -z "$bindir" ]; then
  if command -v pg_ctl >/dev/null 2>&1; then
    bindir="$(dirname "$(command -v pg_ctl)")"
  else
    bindir="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
  fi
fi
if [ -z "$bindir" ] || [ ! -x "$bindir/pg_ctl" ]; then
  echo "Postgres server binaries not found. Set PG_BINDIR to the directory holding pg_ctl." >&2
  exit 1
fi

work="$(mktemp -d)"
port="${PGTEST_PORT:-54329}"

# Postgres refuses to run as root; in containers, hand off to the postgres user.
run() { "$@"; }
if [ "$(id -u)" = "0" ]; then
  chown postgres "$work"
  chmod a+rx "$root" "$root/supabase" "$root/supabase/migrations" "$here" 2>/dev/null || true
  run() { runuser -u postgres -- "$@"; }
fi

cleanup() {
  run "$bindir/pg_ctl" -D "$work/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

run "$bindir/initdb" -D "$work/data" -U postgres -A trust >/dev/null
run "$bindir/pg_ctl" -D "$work/data" -o "-p $port -k $work -c listen_addresses=''" -w -l "$work/log" start >/dev/null

psql_() { run psql -X -q -v ON_ERROR_STOP=1 -h "$work" -p "$port" -U postgres -d postgres "$@"; }

psql_ -f "$here/supabase_stub.sql"
for migration in "$root"/supabase/migrations/*.sql; do
  psql_ -f "$migration"
done
psql_ -f "$here/access_rules.sql"
