// lib/utils.js
// Pure utility functions shared between content.js and popup.js.
// In the browser these are loaded as globals. In Node they are require()'d directly.

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

/**
 * Extracts and URL-decodes the filename from the last path segment of a URL.
 * Returns null if the URL is invalid or has no usable filename.
 */
function decodeFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    let raw = pathParts[pathParts.length - 1];
    if (!raw) return null;

    raw = decodeURIComponent(raw);
    raw = raw.replace(/[?#].*$/, '');

    if (!raw || raw.length < 2) return null;

    return sanitiseFilename(raw);
  } catch {
    return null;
  }
}

/**
 * Replaces characters that are illegal in filesystem filenames.
 * Preserves the file extension.
 */
function sanitiseFilename(filename) {
  return filename
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitises a page title for safe use as a filesystem folder name.
 * Mirrors Web Clipper's sanitizeFileName logic so the folder name matches
 * the note name exactly (allowing Asset Swapper to locate assets).
 *
 * Mac/Linux: removes only / and : (plus Obsidian chars # | ^ [ ] and controls).
 * Windows:   also removes < > " \ ? * (Windows filesystem restrictions).
 */
function sanitiseTitle(title) {
  const platform =
    (typeof navigator !== 'undefined' &&
      (navigator.userAgentData?.platform || navigator.platform)) || '';
  const isWindows = /win/i.test(platform);

  // Remove Obsidian-specific characters (Web Clipper strips these in notes)
  let result = title.replace(/[#|\^\[\]]/g, '');

  if (isWindows) {
    result = result.replace(/[<>:"\/\\?*\x00-\x1F]/g, '');
  } else {
    // macOS / Linux: only / and : are filesystem-illegal
    result = result.replace(/[\/:\x00-\x1F]/g, '');
  }

  result = result
    .replace(/^\.+/, '')    // remove leading periods
    .replace(/\s+/g, ' ')  // collapse multiple spaces (e.g. after removing |)
    .trim()
    .substring(0, 245)
    .trimEnd();             // trailing space after truncation

  return result || 'Untitled';
}

if (typeof module !== 'undefined') {
  module.exports = { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl, sanitiseFilename, sanitiseTitle };
}
