// scripts/build-defuddle.js
// Bundles defuddle into a browser-compatible IIFE for use as a content script.
// Output: lib/defuddle.bundle.js  (exposes window.Defuddle)

const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'node_modules', 'defuddle', 'dist', 'defuddle.js')],
  bundle: true,
  format: 'iife',
  globalName: 'DefuddleExports',
  outfile: path.join(__dirname, '..', 'lib', 'defuddle.bundle.js'),
  platform: 'browser',
  minify: true,
}).then(() => {
  // Append a line that promotes Defuddle to window so content.js can use it as a global
  const fs = require('fs');
  const outfile = path.join(__dirname, '..', 'lib', 'defuddle.bundle.js');
  fs.appendFileSync(outfile, '\nvar Defuddle = DefuddleExports.Defuddle;\n');
  console.log('Built lib/defuddle.bundle.js');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
