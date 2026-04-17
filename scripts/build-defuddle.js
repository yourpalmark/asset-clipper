// scripts/build-defuddle.js
// Bundles defuddle + content.js into a single IIFE for use as a content script.
// Output: content.bundle.js
//
// lib/utils.js is loaded separately via the manifest before content.bundle.js,
// so SUPPORTED_EXTENSIONS and decodeFilenameFromUrl are available as globals.

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Temporary ESM entry that imports Defuddle then loads content.js.
// esbuild resolves and bundles everything into a single IIFE.
const entry = path.join(root, '_content_entry.mjs');
fs.writeFileSync(entry, [
  `import { Defuddle } from ${JSON.stringify(path.join(root, 'node_modules', 'defuddle', 'dist', 'defuddle.js'))};`,
  `globalThis.Defuddle = Defuddle;`,
  // content.js references Defuddle via globalThis and uses CJS exports for tests.
  // esbuild handles the mixed-module case fine during bundling.
  `import ${JSON.stringify(path.join(root, 'content.js'))};`,
].join('\n'));

esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  outfile: path.join(root, 'content.bundle.js'),
  platform: 'browser',
  minify: true,
}).then(() => {
  fs.unlinkSync(entry);
  console.log('Built content.bundle.js');
}).catch((err) => {
  try { fs.unlinkSync(entry); } catch {}
  console.error(err);
  process.exit(1);
});
