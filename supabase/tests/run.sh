#!/usr/bin/env bash
# Apply every migration to a throwaway Postgres and attack the result.
#
#   bash supabase/tests/run.sh
#
# This deliberately does not use the Supabase CLI. It needs nothing but the stock postgres image
# and supabase/tests/shim.sql, so the schema and the policies can be checked in about ten seconds
# rather than after a multi-gigabyte pull — and on a database that starts empty every time, which
# is the only way "did this migration apply cleanly" means anything.
set -u

CONTAINER=${CONTAINER:-vt_pgtest}
IMAGE=${IMAGE:-postgres:16-alpine}
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

psql_f() { MSYS_NO_PATHCONV=1 docker exec -e PGPASSWORD=postgres "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -q -f "$1" 2>&1; }

echo "== starting a clean $IMAGE =="
docker rm -f "$CONTAINER" >/dev/null 2>&1
docker run -d --name "$CONTAINER" -e POSTGRES_PASSWORD=postgres -p 55432:5432 "$IMAGE" >/dev/null || exit 1
until docker exec "$CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker cp "$HERE" "$CONTAINER:/sql" >/dev/null

echo "== supabase shim (auth schema, auth.uid(), the postgrest roles) =="
if ! out=$(psql_f "/sql/tests/shim.sql"); then
  echo "$out" | grep -E 'ERROR|DETAIL' | head -5 | sed 's/^/  /'
  exit 1
fi

echo "== migrations =="
failed=0
for f in "$HERE"/migrations/*.sql; do
  name=$(basename "$f" .sql)
  if out=$(psql_f "/sql/migrations/$name.sql"); then
    echo "  ok    $name"
  else
    echo "  FAIL  $name"
    echo "$out" | grep -E 'ERROR|DETAIL|HINT' | head -6 | sed 's/^/        /'
    failed=1
  fi
done
[ "$failed" -eq 1 ] && { echo; echo "Migrations failed - not running the policy checks against a half-built schema."; exit 1; }

echo
echo "== seed =="
# Applied in the order config.toml lists them - products join categories by name, so the
# catalogue has to come after seed.sql creates them.
for f in seed/seed.sql seed/products.generated.sql; do
  if out=$(psql_f "/sql/$f"); then
    echo "  ok    $f"
  else
    echo "  FAIL  $f"
    echo "$out" | grep -E 'ERROR|DETAIL|LINE' | head -6 | sed 's/^/        /'
    failed=1
  fi
done
[ "$failed" -eq 1 ] && exit 1

counts=$(MSYS_NO_PATHCONV=1 docker exec -e PGPASSWORD=postgres "$CONTAINER" psql -U postgres -tAq -c \
  "select 'branches='||(select count(*) from branches)||' categories='||(select count(*) from categories)||' products='||(select count(*) from products)||' services='||(select count(*) from services)||' repairs='||(select count(*) from repairs)" 2>&1)
echo "  seeded: $counts"

echo
echo "== authorisation =="
if out=$(psql_f "/sql/tests/authz.test.sql"); then
  echo "$out" | grep -E 'pass|FAIL|^==|All checks' | sed 's/^NOTICE:  //' | sed 's/^/  /'
else
  echo "$out" | sed 's/^NOTICE:  //' | sed 's/^/  /' | tail -40
  exit 1
fi
