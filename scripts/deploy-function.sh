#!/usr/bin/env bash
# Deploys one edge function through the Management API, uploading every file
# under its directory, so a function that vendors its engine ships whole.
#
#   scripts/deploy-function.sh generate-workout
#
# Needs SB_TOKEN and SB_REF in ~/.cl1-deploy.env. The part NAME must be `file`
# and the FILENAME carries the path under source/; naming the part itself
# source/index.ts makes the uploader nest it and the entrypoint is not found.
# Cloudflare rejects the default python and curl-less user agents, so one is
# set explicitly. Both learned the hard way on notify-live-start.
set -euo pipefail
slug="${1:?function slug}"
source ~/.cl1-deploy.env
SB_REF="${FT_SB_REF:-$SB_REF}"

# SB_REF in ~/.cl1-deploy.env has pointed at a DIFFERENT project (OneLab/Flow)
# while this repo talks to another one. Deploying blind would have shipped this
# app's function to the wrong database, so the ref is checked against the URL
# index.html actually uses rather than trusted.
app_ref=$(grep -oE 'https://[a-z0-9]+\.supabase\.co' index.html | head -1 | sed -E 's#https://([a-z0-9]+)\.supabase\.co#\1#')
if [ -n "$app_ref" ] && [ "$app_ref" != "$SB_REF" ]; then
  echo "REFUSING: SB_REF is $SB_REF but index.html talks to $app_ref."
  echo "Fix SB_REF in ~/.cl1-deploy.env, or run with SB_REF=$app_ref."
  exit 1
fi

dir="supabase/functions/$slug"
[ -f "$dir/index.ts" ] || { echo "no $dir/index.ts"; exit 1; }

# verify_jwt is per function, and it used to be hardcoded true for all of them.
#
# That is right for the two the app calls with a signed-in user's token, and
# fatal for the ones pg_cron and pg_net call, which send CRON_SECRET as a bearer
# and CRON_SECRET is not a JWT. The gateway rejects those with 401 before a line
# of function code runs, so the function cannot log the failure, and pg_cron
# reports success because all it knows is that the request was queued. Every
# notification this app can send was dead from 03:33 to 09:00 on 2026-09-16
# because one redeploy flipped four functions to true.
#
# So it is a list now. A function not on it verifies JWTs, which is the safe
# default for anything reached from the app.
case "$slug" in
  send-nudges|notify-live-start|notify-clip|notify-report|expire-clips|expire-proofs)
    verify_jwt=false ;;
  *)
    verify_jwt=true ;;
esac
echo "$slug: verify_jwt=$verify_jwt"

args=()
while IFS= read -r f; do
  rel="${f#$dir/}"
  args+=(-F "file=@$f;filename=source/$rel;type=text/plain")
done < <(find "$dir" -type f \( -name '*.ts' -o -name '*.mjs' -o -name '*.json' \) | sort)

echo "uploading ${#args[@]} files for $slug"
curl -sS -X POST "https://api.supabase.com/v1/projects/$SB_REF/functions/deploy?slug=$slug" \
  -H "Authorization: Bearer $SB_TOKEN" \
  -H "User-Agent: curl/8.4.0" \
  -F "metadata={\"name\":\"$slug\",\"entrypoint_path\":\"source/index.ts\",\"verify_jwt\":$verify_jwt};type=application/json" \
  "${args[@]}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print({k:d.get(k) for k in ("slug","version","status","message")})'
