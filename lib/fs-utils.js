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

if (typeof module !== 'undefined') {
  module.exports = { getOrCreateDir, fetchAndWrite };
}
