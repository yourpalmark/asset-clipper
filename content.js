// content.js
// Injected into the active tab. Finds main-content assets and returns their URLs + filenames.

const SUPPORTED_EXTENSIONS = new Set([
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff', 'tif', 'avif', 'heic',
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'csv', 'txt', 'rtf',
  // Video
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v',
  // Audio
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac',
  // Archives
  'zip', 'tar', 'gz', '7z',
]);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getAssets') return;

  const pageTitle = document.title || 'Untitled';
  const assets = extractMainContentAssets();
  sendResponse({ pageTitle, assets });
});

function extractMainContentAssets() {
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
    const el = document.querySelector(selector);
    if (el) { container = el; break; }
  }
  if (!container) container = document.body;

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

function decodeFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    let raw = pathParts[pathParts.length - 1];
    if (!raw) return null;

    raw = decodeURIComponent(raw);
    raw = raw.replace(/[?#].*$/, '');

    if (!raw || raw.length < 2) return null;

    return raw;
  } catch {
    return null;
  }
}
