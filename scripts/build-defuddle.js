// scripts/build-defuddle.js
// Bundles content.js + defuddle into a single IIFE (content.bundle.js).
// lib/utils.js is loaded separately via the manifest.

const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'content.js')],
  bundle: true,
  format: 'iife',
  outfile: path.join(__dirname, '..', 'content.bundle.js'),
  platform: 'browser',
  minify: true,
}).then(() => {
  console.log('Built content.bundle.js');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
