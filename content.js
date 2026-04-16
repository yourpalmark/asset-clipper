// content.js
// Injected into the active tab. Finds main-content assets and returns their URLs + filenames.
// Depends on SUPPORTED_EXTENSIONS and decodeFilenameFromUrl being available as globals,
// provided by lib/utils.js (loaded first via manifest content_scripts, or via tests/setup.js).

// Minimum rendered width (px) for an <img> to be considered main content.
// Images with an explicit width attribute smaller than this are treated as
// inline icons, flags, or decorative elements and skipped.
const MIN_IMG_WIDTH = 50;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getAssets') return;

  const pageTitle = document.title || 'Untitled';
  const assets = extractMainContentAssets(document);
  sendResponse({ pageTitle, assets });
});

/**
 * Scans the main content container of the given document for supported assets.
 * Accepts a `doc` parameter so tests can inject a mock document.
 */
function extractMainContentAssets(doc) {
  if (!doc) doc = document;

  const contentSelectors = [
    '#main-content',
    // MediaWiki / Wikipedia (more specific than generic #content)
    '#mw-content-text',
    '.mw-parser-output',
    // Confluence
    '.wiki-content',
    '#wiki-content',
    '.confluence-content',
    '.page-body',
    // Generic
    'main',
    'article',
    '[role="main"]',
    '#content',
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

  // <img src> — skip images with an explicitly small width (icons, flags, decorative elements)
  for (const el of container.querySelectorAll('img[src]')) {
    const explicitWidth = parseInt(el.getAttribute('width') || '0', 10);
    if (explicitWidth > 0 && explicitWidth < MIN_IMG_WIDTH) continue;
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

  return results;
}

if (typeof module !== 'undefined') {
  module.exports = { extractMainContentAssets, MIN_IMG_WIDTH };
}
