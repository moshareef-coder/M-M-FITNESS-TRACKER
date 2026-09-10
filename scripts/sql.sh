#!/usr/bin/env bash
# Runs one SQL file against Fit Together's database through the Management
# API, the way the migrations in supabase/migrations/ have always been applied
# here (no CLI on this machine).
#
#   scripts/sql.sh supabase/migrations/20260909_focus_groups.sql
#
# It reads FT_SB_REF, never SB_REF: SB_REF in ~/.cl1-deploy.env belongs to a
# different project (OneLab/Flow), and a migration sent there would land on
# the wrong database. The ref is also checked against the URL index.html uses.
set -euo pipefail
file="${1:?sql file}"
source ~/.cl1-deploy.env
ref="${FT_SB_REF:-}"
app_ref=$(grep -oE 'https://[a-z0-9]+\.supabase\.co' index.html | head -1 | sed -E 's#https://([a-z0-9]+)\.supabase\.co#\1#')
[ -n "$ref" ] || { echo "FT_SB_REF is not set in ~/.cl1-deploy.env"; exit 1; }
[ "$ref" = "$app_ref" ] || { echo "REFUSING: FT_SB_REF=$ref but index.html talks to $app_ref"; exit 1; }
python3 - "$file" "$ref" "$SB_TOKEN" <<'PY'
import json, sys, urllib.request
path, ref, token = sys.argv[1:4]
sql = open(path).read()
req = urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query",
  data=json.dumps({"query": sql}).encode(), method="POST",
  headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json", "User-Agent": "curl/8.4.0"})
try:
    body = urllib.request.urlopen(req).read().decode()
    print(f"{path}: ok  {body[:300]}")
except urllib.error.HTTPError as e:
    print(f"{path}: HTTP {e.code}  {e.read().decode()[:600]}"); sys.exit(1)
PY
