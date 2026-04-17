// scripts/build-defuddle.js
// Bundles defuddle into a browser-compatible IIFE for use as a content script.
// Output: lib/defuddle.bundle.js  (exposes globalThis.Defuddle)

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outfile = path.join(__dirname, '..', 'lib', 'defuddle.bundle.js');

// Write a tiny entry wrapper that imports Defuddle and assigns it to globalThis
// so it survives strict-mode scoping in Chrome content scripts.
const entryWrapper = path.join(__dirname, '..', 'lib', '_defuddle_entry.js');
fs.writeFileSync(entryWrapper, `
import { Defuddle } from ${JSON.stringify(
  path.join(__dirname, '..', 'node_modules', 'defuddle', 'dist', 'defuddle.js')
)};
globalThis.Defuddle = Defuddle;
`);

esbuild.build({
  entryPoints: [entryWrapper],
  bundle: true,
  format: 'iife',
  outfile,
  platform: 'browser',
  minify: true,
}).then(() => {
  fs.unlinkSync(entryWrapper);
  console.log('Built lib/defuddle.bundle.js');
}).catch((err) => {
  fs.unlinkSync(entryWrapper);
  console.error(err);
  process.exit(1);
});
