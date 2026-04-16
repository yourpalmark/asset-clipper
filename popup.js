// popup.js
// In the browser, sanitiseTitle / getOrCreateDir / fetchAndWrite are globals from lib/*.js.

let dirHandle = null;       // FileSystemDirectoryHandle — set if user picked a custom location
let savedHandle = null;     // handle loaded from IndexedDB (may need permission re-grant)
let assets = [];
let pageTitle = '';
let scanned = false;

const statusEl = document.getElementById('status');
const imageListEl = document.getElementById('image-list');
const noImagesEl = document.getElementById('no-images');
const clipBtn = document.getElementById('clip-btn');
const vaultDisplay = document.getElementById('vault-path-display');
const selectVaultBtn = document.getElementById('select-vault-btn');

// --- Persist directory handle via IndexedDB ---

const DB_NAME = 'asset-clipper';
const STORE_NAME = 'handles';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME);
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, 'vaultDir');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  chrome.storage.local.set({ vaultFolderName: handle.name });
}

async function loadHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('vaultDir');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// --- Asset Location setting UI ---

function updateVaultDisplay() {
  if (dirHandle) {
    vaultDisplay.textContent = dirHandle.name;
    vaultDisplay.classList.remove('not-set');
    selectVaultBtn.textContent = 'Change';
  } else if (savedHandle) {
    // Handle saved but permission lapsed (e.g. after browser restart)
    chrome.storage.local.get(['vaultFolderName'], (r) => {
      vaultDisplay.textContent = `${r.vaultFolderName || 'Custom folder'} (click Reconnect)`;
    });
    vaultDisplay.classList.add('not-set');
    selectVaultBtn.textContent = 'Reconnect';
  } else {
    vaultDisplay.textContent = 'Downloads (default)';
    vaultDisplay.classList.remove('not-set');
    selectVaultBtn.textContent = 'Browse…';
  }
  updateClipBtn();
}

function updateClipBtn() {
  if (!scanned) return;
  if (assets.length === 0) {
    clipBtn.disabled = true;
    clipBtn.textContent = 'No Assets Found';
  } else {
    clipBtn.disabled = false;
    clipBtn.textContent = `Download ${assets.length} Asset${assets.length !== 1 ? 's' : ''}`;
  }
}

selectVaultBtn.addEventListener('click', async () => {
  // If a handle is saved but permission lapsed, re-request instead of opening picker
  if (savedHandle && !dirHandle) {
    try {
      const perm = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        dirHandle = savedHandle;
        updateVaultDisplay();
        setStatus('Location reconnected.', 'success');
        return;
      }
    } catch {
      // Fall through to picker
    }
  }

  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    dirHandle = handle;
    savedHandle = handle;
    await saveHandle(handle);
    updateVaultDisplay();
    setStatus('Asset location set.', 'success');
  } catch (err) {
    if (err.name !== 'AbortError') {
      setStatus('Could not select folder.', 'error');
    }
  }
});

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
}

// --- Load saved setting and scan on open ---

async function init() {
  try {
    const handle = await loadHandle();
    if (handle) {
      savedHandle = handle;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        dirHandle = handle;
      }
    }
  } catch {
    dirHandle = null;
    savedHandle = null;
  }
  updateVaultDisplay();
  scanAssets();
}

init();

// --- Render asset list ---

function renderAssetList() {
  imageListEl.innerHTML = '';

  if (assets.length === 0) {
    imageListEl.style.display = 'none';
    noImagesEl.style.display = 'block';
    clipBtn.disabled = true;
    clipBtn.textContent = 'No Assets Found';
    return;
  }

  imageListEl.style.display = 'block';
  noImagesEl.style.display = 'none';

  assets.forEach((asset, i) => {
    const item = document.createElement('li');
    item.className = 'image-item';

    const name = document.createElement('span');
    name.className = 'filename';
    name.title = asset.filename;
    name.textContent = asset.filename;

    const stat = document.createElement('span');
    stat.className = 'item-status pending';
    stat.textContent = 'pending';
    stat.id = `item-status-${i}`;

    item.appendChild(name);
    item.appendChild(stat);
    imageListEl.appendChild(item);
  });

  updateClipBtn();
}

// --- Scan for assets (runs automatically on popup open) ---

function scanAssets() {
  setStatus('Scanning page…', 'loading');
  clipBtn.disabled = true;
  clipBtn.textContent = 'Scanning…';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabId, { action: 'getAssets' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        setStatus('Could not scan page. Try reloading the tab.', 'error');
        clipBtn.disabled = true;
        clipBtn.textContent = 'Scan Failed';
        return;
      }

      assets = response.assets;
      pageTitle = sanitiseTitle(response.pageTitle || 'Untitled');
      scanned = true;

      if (assets.length === 0) {
        setStatus('No assets found in main content.');
      } else {
        setStatus(`Found ${assets.length} asset${assets.length !== 1 ? 's' : ''}.`);
      }

      renderAssetList();
    });
  });
}

// --- Download assets ---

clipBtn.addEventListener('click', async () => {
  if (!scanned || assets.length === 0) return;

  clipBtn.disabled = true;
  clipBtn.textContent = 'Downloading…';
  setStatus('Downloading assets…', 'loading');

  let successCount = 0;
  let errorCount = 0;

  if (dirHandle) {
    // Custom location: use File System Access API
    try {
      const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        setStatus('Permission denied for asset location.', 'error');
        updateClipBtn();
        return;
      }
    } catch {
      setStatus('Could not get permission for asset location.', 'error');
      updateClipBtn();
      return;
    }

    let targetDir;
    try {
      targetDir = await getOrCreateDir(dirHandle, ['raw', 'assets', pageTitle]);
    } catch (err) {
      setStatus('Could not create assets folder.', 'error');
      console.error('Asset Clipper: folder creation failed', err);
      updateClipBtn();
      return;
    }

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const itemEl = document.getElementById(`item-status-${i}`);
      if (itemEl) { itemEl.textContent = '↓'; itemEl.className = 'item-status downloading'; }

      try {
        await fetchAndWrite(asset.url, asset.filename, targetDir);
        successCount++;
        if (itemEl) { itemEl.textContent = '✓'; itemEl.className = 'item-status done'; }
      } catch (err) {
        errorCount++;
        if (itemEl) { itemEl.textContent = '✗'; itemEl.className = 'item-status error'; }
        console.error(`Asset Clipper: failed ${asset.url}`, err);
      }
    }
  } else {
    // Default: use chrome.downloads (saves to system Downloads folder)
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const itemEl = document.getElementById(`item-status-${i}`);
      if (itemEl) { itemEl.textContent = '↓'; itemEl.className = 'item-status downloading'; }

      try {
        await fetchAndDownload(asset.url, `${pageTitle}/${asset.filename}`);
        successCount++;
        if (itemEl) { itemEl.textContent = '✓'; itemEl.className = 'item-status done'; }
      } catch (err) {
        errorCount++;
        if (itemEl) { itemEl.textContent = '✗'; itemEl.className = 'item-status error'; }
        console.error(`Asset Clipper: failed ${asset.url}`, err);
      }
    }
  }

  if (errorCount === 0) {
    setStatus(`Downloaded ${successCount} asset${successCount !== 1 ? 's' : ''} successfully.`, 'success');
  } else {
    setStatus(`${successCount} succeeded, ${errorCount} failed.`, errorCount === assets.length ? 'error' : '');
  }

  clipBtn.textContent = 'Done';
});
