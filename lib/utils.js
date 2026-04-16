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
 */
function sanitiseTitle(title) {
  return title
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

if (typeof module !== 'undefined') {
  module.exports = { SUPPORTED_EXTENSIONS, decodeFilenameFromUrl, sanitiseFilename, sanitiseTitle };
}
