"""Print the highest build number App Store Connect has ever seen for Unio.

release-ios.sh uses it so a new build never reuses a number. That has already
happened: build 38 was uploaded by something nobody remembers, and the next
upload collided with it.

The .p8 signing key is read from ~/.appstoreconnect/private_keys/ and never
lives in this repo. KEY_ID and ISSUER_ID are identifiers, not secrets. openssl
does the signing because neither pyjwt nor cryptography is installed here, and
it emits a DER signature where JOSE wants raw r||s, so that is unpacked by hand.
"""
import base64, json, os, subprocess, sys, time, urllib.request

KEY_ID = "4X3J46W9NL"
ISSUER_ID = "557548a2-d8f5-44ff-85e6-5aaf4c6ae69d"
APP_ID = "6812201708"
KEY = os.path.expanduser(f"~/.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8")

def jwt():
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=")
    head = b64(json.dumps({"alg": "ES256", "kid": KEY_ID, "typ": "JWT"}).encode())
    now = int(time.time())
    body = b64(json.dumps({"iss": ISSUER_ID, "iat": now, "exp": now + 600,
                           "aud": "appstoreconnect-v1"}).encode())
    msg = head + b"." + body
    der = subprocess.run(["openssl", "dgst", "-sha256", "-sign", KEY],
                         input=msg, capture_output=True, check=True).stdout
    i = 4 if der[1] & 0x80 == 0 else 5
    r = der[i:i + der[i - 1]]
    j = i + der[i - 1] + 2
    s = der[j:j + der[j - 1]]
    sig = r.rjust(32, b"\0")[-32:] + s.rjust(32, b"\0")[-32:]
    return (msg + b"." + b64(sig)).decode()

url = (f"https://api.appstoreconnect.apple.com/v1/builds"
       f"?filter%5Bapp%5D={APP_ID}&sort=-version&limit=200&fields%5Bbuilds%5D=version")
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {jwt()}"})
data = json.load(urllib.request.urlopen(req, timeout=30))
nums = [int(b["attributes"]["version"]) for b in data.get("data", [])
        if str(b["attributes"].get("version", "")).isdigit()]
if not nums:
    sys.exit(1)
print(max(nums))
