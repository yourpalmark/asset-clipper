// content.js
// Injected into the active tab via content.bundle.js (built by `npm run build`).
// SUPPORTED_EXTENSIONS and decodeFilenameFromUrl are globals from lib/utils.js.

const Defuddle = require('defuddle');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getAssets') return;

  const result = extractWithDefuddle(document);
  sendResponse({ pageTitle: result.pageTitle, assets: result.assets });
});

/**
 * Runs defuddle on the given document to extract the main content,
 * then scans that content for supported assets.
 * Accepts a `doc` parameter so tests can inject a mock document.
 */
function extractWithDefuddle(doc) {
  if (!doc) doc = document;

  let defuddleResult;
  try {
    defuddleResult = new Defuddle(doc, { url: doc.URL || '' }).parse();
  } catch (err) {
    console.warn('Asset Clipper: defuddle failed, falling back to body scan', err);
    return {
      pageTitle: doc.title || 'Untitled',
      assets: extractAssetsFromContainer(doc.body),
    };
  }

  const tempDiv = doc.createElement('div');
  tempDiv.innerHTML = defuddleResult.content || '';

  const pageTitle = defuddleResult.title || doc.title || 'Untitled';
  const assets = extractAssetsFromContainer(tempDiv);

  return { pageTitle, assets };
}

/**
 * Scans a DOM container for all supported asset URLs.
 */
function extractAssetsFromContainer(container) {
  if (!container) return [];

  const seen = new Set();
  const results = [];

  function add(url) {
    if (!url || url.startsWith('data:') || seen.has(url)) return;
    const filename = decodeFilenameFromUrl(url);
    if (!filename) return;
    const ext = filename.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return;
    seen.add(url);
    results.push({ url, filename });
  }

  for (const el of container.querySelectorAll('img[src]')) {
    const explicitWidth = parseInt(el.getAttribute('width') || '0', 10);
    if (explicitWidth > 0 && explicitWidth < 50) continue;
    add(el.src || el.getAttribute('src'));
  }

  for (const el of container.querySelectorAll('video[src], video source[src]')) {
    add(el.src || el.getAttribute('src'));
  }

  for (const el of container.querySelectorAll('audio[src], audio source[src]')) {
    add(el.src || el.getAttribute('src'));
  }

  for (const el of container.querySelectorAll('embed[src]')) {
    add(el.src || el.getAttribute('src'));
  }

  for (const el of container.querySelectorAll('object[data]')) {
    add(el.data || el.getAttribute('data'));
  }

  for (const el of container.querySelectorAll('a[href]')) {
    add(el.href || el.getAttribute('href'));
  }

  return results;
}

if (typeof module !== 'undefined') {
  module.exports = { extractWithDefuddle, extractAssetsFromContainer };
}
