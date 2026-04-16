// content.js
// Injected into the active tab. Finds main-content assets and returns their URLs + filenames.
// In the browser, SUPPORTED_EXTENSIONS and decodeFilenameFromUrl are globals from lib/utils.js.
// In Node (tests), we import them explicitly.

if (typeof module !== 'undefined') {
  var { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl } = require('./lib/utils');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getAssets') return;

  const pageTitle = document.title || 'Untitled';
  const assets = extractMainContentAssets(document);
  sendResponse({ pageTitle, assets });
});

/**
 * Scans the main content container of the given document for supported assets.
 * Accepts an optional `doc` parameter so tests can inject a mock document.
 */
function extractMainContentAssets(doc) {
  if (!doc) doc = document;

  const contentSelectors = [
    '#main-content',
    '#content',
    'main',
    'article',
    '[role="main"]',
    '.wiki-content',        // Confluence
    '#wiki-content',        // Confluence alternate
    '.confluence-content',  // Confluence alternate
    '.page-body',
    '.entry-content',
    '.post-content',
    '.article-body',
  ];

  let container = null;
  for (const selector of contentSelectors) {
    const el = doc.querySelector(selector);
    if (el) { container = el; break; }
  }
  if (!container) container = doc.body;

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

  // <img src>
  for (const el of container.querySelectorAll('img[src]')) {
    add(el.src);
  }

  // <video src> and <video><source src>
  for (const el of container.querySelectorAll('video[src], video source[src]')) {
    add(el.src);
  }

  // <audio src> and <audio><source src>
  for (const el of container.querySelectorAll('audio[src], audio source[src]')) {
    add(el.src);
  }

  // <embed src>
  for (const el of container.querySelectorAll('embed[src]')) {
    add(el.src);
  }

  // <object data>
  for (const el of container.querySelectorAll('object[data]')) {
    add(el.data);
  }

  // <a href> — only links whose href points to a supported file type
  for (const el of container.querySelectorAll('a[href]')) {
    add(el.href);
  }

  return results;
}

if (typeof module !== 'undefined') {
  module.exports = { extractMainContentAssets };
}
