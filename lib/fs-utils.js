// lib/fs-utils.js
// File System Access API helpers used by popup.js.

/**
 * Traverses (and creates) nested subdirectories within a root FileSystemDirectoryHandle.
 * @param {FileSystemDirectoryHandle} rootHandle
 * @param {string[]} pathParts  e.g. ['raw', 'assets', 'Page Title']
 * @returns {Promise<FileSystemDirectoryHandle>} the innermost directory handle
 */
async function getOrCreateDir(rootHandle, pathParts) {
  let current = rootHandle;
  for (const part of pathParts) {
    current = await current.getDirectoryHandle(part, { create: true });
  }
  return current;
}

/**
 * Fetches a URL using the active browser session (credentials: 'include') and
 * writes the response body as a file into the given directory handle.
 * @param {string} url
 * @param {string} filename
 * @param {FileSystemDirectoryHandle} dirHandle
 */
async function fetchAndWrite(url, filename, dirHandle) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/**
 * Fetches a URL using the active browser session and saves it via chrome.downloads.
 * Used when no custom folder is configured — files land in the system Downloads folder.
 * @param {string} url
 * @param {string} relativePath  e.g. 'Page Title/filename.png'
 */
async function fetchAndDownload(url, relativePath) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      { url: objectUrl, filename: relativePath, conflictAction: 'overwrite', saveAs: false },
      (downloadId) => {
        if (chrome.runtime.lastError || downloadId === undefined) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error(chrome.runtime.lastError?.message || 'Download failed'));
          return;
        }
        const interval = setInterval(() => {
          chrome.downloads.search({ id: downloadId }, (results) => {
            if (!results || results.length === 0) return;
            const dl = results[0];
            if (dl.state === 'complete') {
              clearInterval(interval);
              URL.revokeObjectURL(objectUrl);
              resolve();
            } else if (dl.state === 'interrupted') {
              clearInterval(interval);
              URL.revokeObjectURL(objectUrl);
              reject(new Error(`Download interrupted: ${dl.error}`));
            }
          });
        }, 300);
      }
    );
  });
}

if (typeof module !== 'undefined') {
  module.exports = { getOrCreateDir, fetchAndWrite, fetchAndDownload };
}
