// scripts/build-defuddle.js
// Bundles defuddle + content.js into a single IIFE for use as a content script.
// Output: content.bundle.js
//
// Uses esbuild's inject option to replace the free variable reference to
// `Defuddle` in content.js with the actual imported class — all in the same
// bundle scope, avoiding globalThis / isolated-world scoping issues.
//
// lib/utils.js is loaded separately via the manifest before content.bundle.js,
// so SUPPORTED_EXTENSIONS and decodeFilenameFromUrl are available as globals.

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const defuddlePath = path.join(root, 'node_modules', 'defuddle', 'dist', 'defuddle.js');

// Shim that tells esbuild: "resolve the free variable `Defuddle` from this export"
const shim = path.join(root, '_defuddle_shim.mjs');
fs.writeFileSync(shim, `export { Defuddle } from ${JSON.stringify(defuddlePath)};\n`);

esbuild.build({
  entryPoints: [path.join(root, 'content.js')],
  inject: [shim],
  bundle: true,
  format: 'iife',
  outfile: path.join(root, 'content.bundle.js'),
  platform: 'browser',
  minify: true,
}).then(() => {
  fs.unlinkSync(shim);
  console.log('Built content.bundle.js');
}).catch((err) => {
  try { fs.unlinkSync(shim); } catch {}
  console.error(err);
  process.exit(1);
});
