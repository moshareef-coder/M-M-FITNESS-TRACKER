#!/usr/bin/env bash
# One command from index.html to an uploaded, verified iOS build.
#
# Every step here was run by hand for builds 38 to 44 and every failure mode it
# guards against actually happened: cap sync shipping a days-old www/ because
# sync-web was skipped, a build number that collided with one already on App
# Store Connect, a bundle missing a module the app imports, and an IPA that was
# never opened to check what was really inside it. The script stops at the
# first thing that is wrong rather than uploading something plausible.
#
#   scripts/release-ios.sh            gate, bump, build, verify, upload
#   scripts/release-ios.sh --dry-run  everything except the upload
#
# Needs ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8 and the
# distribution profiles named in /tmp/ExportOptions.plist (see below).

set -euo pipefail
cd "$(dirname "$0")/.."

KEY_ID="4X3J46W9NL"
ISSUER_ID="557548a2-d8f5-44ff-85e6-5aaf4c6ae69d"
TEAM_ID="S93Z4UM9U4"
PBX="ios/App/App.xcodeproj/project.pbxproj"
DRY=0; [[ "${1:-}" == "--dry-run" ]] && DRY=1

say()  { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31mSTOP: %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- the gate
say "Gate"
node scripts/boot-check.mjs >/dev/null || die "boot-check failed"
node mo-knowledge/engine/demo.mjs --check >/dev/null || die "engine determinism failed"
node mo-knowledge/engine/sweep.mjs >/dev/null || die "engine sweep failed"
node knowledge/motion/validate.mjs >/dev/null || die "move library failed validation"
echo "  passed"

# ---------------------------------------------------------------- versions
say "Versions"
BUILDS=$(grep -o 'CURRENT_PROJECT_VERSION = [0-9]*' "$PBX" | sort -u)
[[ $(echo "$BUILDS" | wc -l | tr -d ' ') == 1 ]] || die "CURRENT_PROJECT_VERSION disagrees with itself:
$BUILDS"
CUR=$(echo "$BUILDS" | grep -o '[0-9]*$')
NEXT=$((CUR + 1))
# Never reuse a number App Store Connect has already seen, including ones no
# session remembers uploading (build 38 was one).
HIGHEST=$(python3 scripts/asc-highest-build.py 2>/dev/null || echo "$CUR")
(( NEXT <= HIGHEST )) && NEXT=$((HIGHEST + 1))
APPV_OLD=$(grep -o 'const APP_VERSION = "[^"]*"' index.html | sed 's/.*"\(.*\)"/\1/')
TODAY=$(date +%Y.%m.%d)
if [[ "$APPV_OLD" == "$TODAY".* ]]; then
  APPV_NEW="$TODAY.$(( ${APPV_OLD##*.} + 1 ))"
else
  APPV_NEW="$TODAY.1"
fi
echo "  build $CUR -> $NEXT"
echo "  web   $APPV_OLD -> $APPV_NEW"
sed -i '' "s/CURRENT_PROJECT_VERSION = $CUR;/CURRENT_PROJECT_VERSION = $NEXT;/g" "$PBX"
sed -i '' "s/const APP_VERSION = \"$APPV_OLD\"/const APP_VERSION = \"$APPV_NEW\"/" index.html
sed -i '' "s/const CACHE = \"unio-$APPV_OLD\"/const CACHE = \"unio-$APPV_NEW\"/" sw.js
[[ $(grep -c "CURRENT_PROJECT_VERSION = $NEXT;" "$PBX") == 4 ]] || die "build number did not land in all four places"
grep -q "const CACHE = \"unio-$APPV_NEW\"" sw.js || die "sw.js CACHE did not move with APP_VERSION"

# ---------------------------------------------------------------- bundle
say "Bundle"
# sync-web first, always. cap sync copies www/ and never reads index.html.
node scripts/sync-web.mjs | tail -2 || die "sync-web found missing runtime imports"
npx cap sync ios >/dev/null
node scripts/register-native-plugins.mjs | tail -1
diff -q <(shasum -a 256 index.html | cut -d' ' -f1) \
        <(shasum -a 256 ios/App/App/public/index.html | cut -d' ' -f1) >/dev/null \
  || die "the iOS bundle does not match index.html"
echo "  bundle matches source"

# ---------------------------------------------------------------- build
say "Archive and export"
ARCHIVE="/tmp/unio$NEXT.xcarchive"; EXPORT="/tmp/unio$NEXT-export"
rm -rf "$ARCHIVE" "$EXPORT"
( cd ios/App && xcodebuild -workspace App.xcworkspace -scheme App -configuration Release \
    -destination "generic/platform=iOS" -archivePath "$ARCHIVE" archive \
    CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM="$TEAM_ID" 2>&1 | grep -E "ARCHIVE (SUCCEEDED|FAILED)|error:" ) \
  | tee /dev/stderr | grep -q "ARCHIVE SUCCEEDED" || die "archive failed"
[[ -f /tmp/ExportOptions.plist ]] || die "/tmp/ExportOptions.plist is missing (manual signing, the two 'Unio ... App Store' profiles)"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT" \
  -exportOptionsPlist /tmp/ExportOptions.plist 2>&1 | grep -q "EXPORT SUCCEEDED" || die "export failed"

# ---------------------------------------------------------------- verify
say "Verify the IPA itself, not the tree it came from"
V="/tmp/v$NEXT"; rm -rf "$V"; mkdir -p "$V"; unzip -q "$EXPORT/App.ipa" -d "$V"
APP="$V/Payload/App.app"
GOT_BUILD=$(/usr/libexec/PlistBuddy -c 'Print CFBundleVersion' "$APP/Info.plist")
GOT_WEB=$(grep -o 'const APP_VERSION = "[^"]*"' "$APP/public/index.html" | sed 's/.*"\(.*\)"/\1/')
CDN=$(grep -c 'cdn.jsdelivr.net\|fonts.googleapis.com' "$APP/public/index.html" || true)
APS=$(codesign -d --entitlements - --xml "$APP" 2>/dev/null | plutil -convert xml1 -o - - | grep -A1 aps-environment | tail -1 | sed -E 's/.*<string>(.*)<\/string>.*/\1/')
GTA=$(codesign -d --entitlements - --xml "$APP" 2>/dev/null | plutil -convert xml1 -o - - | grep -A1 get-task-allow | tail -1 | tr -d ' \t')
printf '  build            %s\n  web version      %s\n  CDN references   %s\n  aps-environment  %s\n  get-task-allow   %s\n' \
  "$GOT_BUILD" "$GOT_WEB" "$CDN" "$APS" "$GTA"
[[ "$GOT_BUILD" == "$NEXT" ]]      || die "IPA says build $GOT_BUILD, expected $NEXT"
[[ "$GOT_WEB" == "$APPV_NEW" ]]    || die "IPA carries web $GOT_WEB, expected $APPV_NEW"
[[ "$CDN" == 0 ]]                  || die "the bundle still fetches code from a CDN"
[[ "$APS" == production ]]         || die "push environment is $APS, not production"
[[ "$GTA" == "<false/>" ]]         || die "get-task-allow is not false"
[[ -f "$APP/public/knowledge/motion/moves/cardio.mjs" ]] || die "motion library incomplete in the IPA"

if (( DRY )); then
  say "Dry run: not uploading. IPA at $EXPORT/App.ipa"
  echo "  Versions were bumped in the working tree. git checkout the three files to undo."
  exit 0
fi

# ---------------------------------------------------------------- upload
say "Upload"
xcrun altool --upload-app -f "$EXPORT/App.ipa" -t ios --apiKey "$KEY_ID" --apiIssuer "$ISSUER_ID" 2>&1 \
  | grep -E "No errors|ERROR" | head -3
say "Done: build $NEXT ($APPV_NEW) uploaded"
echo "  It needs 5 to 15 minutes to process before it can be attached or tested."
echo "  Commit the bump: git add $PBX sw.js, and stage only the APP_VERSION hunk of index.html."
