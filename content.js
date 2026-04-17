// content.js
// Injected into the active tab. Uses defuddle to extract main-content assets,
// matching the same content area that Obsidian Web Clipper clips from.
// Depends on SUPPORTED_EXTENSIONS, decodeFilenameFromUrl (lib/utils.js) and
// Defuddle (lib/defuddle.bundle.js) being loaded first as content scripts.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getAssets') return;

  const result = extractWithDefuddle(document);
  sendResponse({ pageTitle: result.pageTitle, assets: result.assets });
});

/**
 * Runs defuddle on the given document to extract the main content,
 * then scans that content for supported assets.
 * Accepts a `doc` parameter so tests can inject a mock document.
 * Passes the live document directly (matching Web Clipper's approach) so
 * defuddle has access to all meta tags including dynamically-set ones.
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

  console.log('Asset Clipper: document.title =', doc.title);
  console.log('Asset Clipper: defuddle.title =', defuddleResult.title);
  console.log('Asset Clipper: defuddle.site =', defuddleResult.site);

  // Parse the extracted content HTML into a temporary container so we can
  // query it with the DOM API.
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

  // <img src> — skip images with an explicitly small width (icons, flags)
  for (const el of container.querySelectorAll('img[src]')) {
    const explicitWidth = parseInt(el.getAttribute('width') || '0', 10);
    if (explicitWidth > 0 && explicitWidth < 50) continue;
    add(el.src || el.getAttribute('src'));
  }

  // <video src> and <video><source src>
  for (const el of container.querySelectorAll('video[src], video source[src]')) {
    add(el.src || el.getAttribute('src'));
  }

  // <audio src> and <audio><source src>
  for (const el of container.querySelectorAll('audio[src], audio source[src]')) {
    add(el.src || el.getAttribute('src'));
  }

  // <embed src>
  for (const el of container.querySelectorAll('embed[src]')) {
    add(el.src || el.getAttribute('src'));
  }

  // <object data>
  for (const el of container.querySelectorAll('object[data]')) {
    add(el.data || el.getAttribute('data'));
  }

  return results;
}

if (typeof module !== 'undefined') {
  module.exports = { extractWithDefuddle, extractAssetsFromContainer };
}
