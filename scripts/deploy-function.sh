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
dir="supabase/functions/$slug"
[ -f "$dir/index.ts" ] || { echo "no $dir/index.ts"; exit 1; }

args=()
while IFS= read -r f; do
  rel="${f#$dir/}"
  args+=(-F "file=@$f;filename=source/$rel;type=text/plain")
done < <(find "$dir" -type f \( -name '*.ts' -o -name '*.mjs' -o -name '*.json' \) | sort)

echo "uploading ${#args[@]} files for $slug"
curl -sS -X POST "https://api.supabase.com/v1/projects/$SB_REF/functions/deploy?slug=$slug" \
  -H "Authorization: Bearer $SB_TOKEN" \
  -H "User-Agent: curl/8.4.0" \
  -F "metadata={\"name\":\"$slug\",\"entrypoint_path\":\"source/index.ts\",\"verify_jwt\":true};type=application/json" \
  "${args[@]}" | python3 -c 'import json,sys; d=json.load(sys.stdin); print({k:d.get(k) for k in ("slug","version","status","message")})'
