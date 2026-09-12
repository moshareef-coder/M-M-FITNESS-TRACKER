/* Rebuilds vendor/three/three-<version>.module.js.

     node scripts/vendor-three.mjs <path-to-three.module.js> [version]

   WHY A FACADE. The body under knowledge/motion/body3d does `import * as THREE
   from "three"`, so whatever this file exports IS the THREE namespace the body
   sees. three.module.js ships every loader, every material and every helper;
   the ecorche uses about twenty classes. Naming them in EXPORTS lets esbuild
   drop the rest, which is where 1273 KB becomes ~500 KB.

   The list is deliberately wider than what the body uses today, because
   body.mjs and view.mjs are maintained outside this repo and get re-copied in.
   A class missing here fails as `THREE.Foo is not a constructor` at mount, and
   the app falls back to the 2D figure, so the failure is soft, but adding the
   name here and rerunning this is the fix. The extra names cost ~16 KB. */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, copyFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXPORTS = [
  "AmbientLight", "BackSide", "Box2", "Box3", "BufferAttribute", "BufferGeometry",
  "CanvasTexture", "CapsuleGeometry", "CatmullRomCurve3", "CircleGeometry", "Color",
  "CylinderGeometry", "BoxGeometry", "DataTexture", "DirectionalLight", "DoubleSide",
  "Euler", "Float32BufferAttribute", "FrontSide", "Group", "HemisphereLight",
  "InterleavedBuffer", "InterleavedBufferAttribute", "LinearFilter", "Line",
  "LineBasicMaterial", "MathUtils", "Matrix3", "Matrix4", "Mesh", "MeshBasicMaterial",
  "MeshToonMaterial", "NearestFilter", "Object3D", "OrthographicCamera",
  "PerspectiveCamera", "PlaneGeometry", "PointLight", "Quaternion", "RedFormat",
  "RGBAFormat", "RingGeometry", "Scene", "Sphere", "SphereGeometry", "Texture",
  "TorusGeometry", "TubeGeometry", "Uint16BufferAttribute", "Vector2", "Vector3",
  "Vector4", "WebGLRenderer",
];

const [srcArg, version = "0.160.1"] = process.argv.slice(2);
if (!srcArg) throw new Error("usage: node scripts/vendor-three.mjs <path-to-three.module.js> [version]");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(join(tmpdir(), "vendor-three-"));
copyFileSync(srcArg, join(work, "three.module.js"));
writeFileSync(join(work, "facade.mjs"),
  `export { ${EXPORTS.join(", ")} } from "./three.module.js";\n`);

const out = join(root, "vendor", "three", `three-${version}.module.js`);
execFileSync("npx", ["--yes", "esbuild@0.24.0", join(work, "facade.mjs"),
  "--bundle", "--format=esm", "--minify", "--legal-comments=none", "--outfile=" + out],
  { stdio: "inherit" });
console.log(`${out} (${(statSync(out).size / 1024).toFixed(0)} KB)`);
console.log("remember: the importmap in index.html pins this filename");
