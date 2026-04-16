// content.js
// Injected into the active tab. Finds main-content images and returns their URLs + filenames.

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'getImages') return;

  const pageTitle = document.title || 'Untitled';
  const images = extractMainContentImages();
  sendResponse({ pageTitle, images });
});

function extractMainContentImages() {
  // Candidate selectors for main content areas, ordered by specificity.
  // Falls back to <body> if none match.
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
    if (el) {
      container = el;
      break;
    }
  }
  if (!container) container = document.body;

  const imgEls = container.querySelectorAll('img');
  const seen = new Set();
  const results = [];

  for (const img of imgEls) {
    const src = img.src;
    if (!src || src.startsWith('data:')) continue; // skip inline data URIs
    if (seen.has(src)) continue;
    seen.add(src);

    const filename = decodeFilenameFromUrl(src);
    if (!filename) continue;

    results.push({ url: src, filename });
  }

  return results;
}

function decodeFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    // Get the last path segment
    const pathParts = parsed.pathname.split('/');
    let raw = pathParts[pathParts.length - 1];
    if (!raw) return null;

    // URL-decode (handles %20, %E2%80%AF, etc.)
    raw = decodeURIComponent(raw);

    // Strip query-string residue if the path had no extension and filename bled into it
    // (shouldn't happen after URL parsing, but be safe)
    raw = raw.replace(/[?#].*$/, '');

    // Ensure there's something file-like
    if (!raw || raw.length < 2) return null;

    return raw;
  } catch {
    return null;
  }
}
