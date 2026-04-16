// popup.js

let vaultPath = '';
let images = [];
let pageTitle = '';
let scanned = false;

const statusEl = document.getElementById('status');
const imageListEl = document.getElementById('image-list');
const noImagesEl = document.getElementById('no-images');
const clipBtn = document.getElementById('clip-btn');
const vaultPathDisplay = document.getElementById('vault-path-display');
const settingsPanel = document.getElementById('settings-panel');
const vaultPathInput = document.getElementById('vault-path-input');

// --- Settings ---

document.getElementById('toggle-settings').addEventListener('click', () => {
  const open = settingsPanel.style.display === 'block';
  settingsPanel.style.display = open ? 'none' : 'block';
  if (!open) vaultPathInput.value = vaultPath;
});

document.getElementById('save-settings').addEventListener('click', () => {
  const val = vaultPathInput.value.trim().replace(/\/+$/, '');
  chrome.storage.local.set({ vaultPath: val }, () => {
    vaultPath = val;
    updateVaultDisplay();
    settingsPanel.style.display = 'none';
    setStatus('Vault path saved.', 'success');
  });
});

function updateVaultDisplay() {
  if (vaultPath) {
    vaultPathDisplay.textContent = vaultPath;
    vaultPathDisplay.classList.remove('not-set');
  } else {
    vaultPathDisplay.textContent = 'No vault path set — click ⚙ to configure';
    vaultPathDisplay.classList.add('not-set');
  }
}

function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className = 'status ' + type;
}

// --- Load saved settings and scan on open ---

chrome.storage.local.get(['vaultPath'], (result) => {
  vaultPath = result.vaultPath || '';
  updateVaultDisplay();
  scanImages();
});

// --- Sanitise page title for use as a folder name ---

function sanitiseTitle(title) {
  return title
    .replace(/[/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 80);
}

// --- Render image list ---

function renderImageList() {
  imageListEl.innerHTML = '';

  if (images.length === 0) {
    imageListEl.style.display = 'none';
    noImagesEl.style.display = 'block';
    clipBtn.disabled = true;
    clipBtn.textContent = 'No Images Found';
    return;
  }

  imageListEl.style.display = 'block';
  noImagesEl.style.display = 'none';

  images.forEach((img, i) => {
    const item = document.createElement('li');
    item.className = 'image-item';

    const name = document.createElement('span');
    name.className = 'filename';
    name.title = img.filename;
    name.textContent = img.filename;

    const stat = document.createElement('span');
    stat.className = 'item-status pending';
    stat.textContent = 'pending';
    stat.id = `item-status-${i}`;

    item.appendChild(name);
    item.appendChild(stat);
    imageListEl.appendChild(item);
  });

  clipBtn.disabled = !vaultPath;
  clipBtn.textContent = `Download ${images.length} Image${images.length !== 1 ? 's' : ''}`;
}

// --- Scan for images (runs automatically on popup open) ---

function scanImages() {
  setStatus('Scanning page...', 'loading');
  clipBtn.disabled = true;
  clipBtn.textContent = 'Scanning…';

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabId, { action: 'getImages' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        setStatus('Could not scan page. Try reloading the tab.', 'error');
        clipBtn.disabled = true;
        clipBtn.textContent = 'Scan Failed';
        return;
      }

      images = response.images;
      pageTitle = sanitiseTitle(response.pageTitle || 'Untitled');
      scanned = true;

      if (images.length === 0) {
        setStatus('No images found in main content.');
      } else {
        setStatus(`Found ${images.length} image${images.length !== 1 ? 's' : ''}.`);
      }

      renderImageList();
    });
  });
}

// --- Download images ---

clipBtn.addEventListener('click', async () => {
  if (!vaultPath || !scanned || images.length === 0) return;

  clipBtn.disabled = true;
  clipBtn.textContent = 'Downloading…';
  setStatus('Downloading images…', 'loading');

  // chrome.downloads uses paths relative to the system Downloads folder.
  // If vaultPath is set, it is a relative path from Downloads to the vault root.
  const folderPath = vaultPath
    ? `${vaultPath}/raw/assets/${pageTitle}`
    : `raw/assets/${pageTitle}`;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const itemStatusEl = document.getElementById(`item-status-${i}`);

    if (itemStatusEl) {
      itemStatusEl.textContent = '↓';
      itemStatusEl.className = 'item-status downloading';
    }

    try {
      await downloadImage(img.url, `${folderPath}/${img.filename}`);
      successCount++;
      if (itemStatusEl) {
        itemStatusEl.textContent = '✓';
        itemStatusEl.className = 'item-status done';
      }
    } catch (err) {
      errorCount++;
      if (itemStatusEl) {
        itemStatusEl.textContent = '✗';
        itemStatusEl.className = 'item-status error';
      }
      console.error(`Asset Clipper: failed to download ${img.url}`, err);
    }
  }

  if (errorCount === 0) {
    setStatus(`Downloaded ${successCount} image${successCount !== 1 ? 's' : ''} successfully.`, 'success');
  } else {
    setStatus(`${successCount} succeeded, ${errorCount} failed.`, errorCount === images.length ? 'error' : '');
  }

  clipBtn.textContent = 'Done';
});

// --- Download a single image via chrome.downloads API ---

function downloadImage(url, filePath) {
  return new Promise((resolve, reject) => {
    // Normalise path separators for the OS — chrome.downloads expects forward slashes on Mac/Linux
    const normPath = filePath.replace(/\\/g, '/');

    chrome.downloads.download(
      {
        url,
        filename: normPath,
        conflictAction: 'overwrite',
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError || downloadId === undefined) {
          reject(new Error(chrome.runtime.lastError?.message || 'Download failed'));
          return;
        }

        // Poll for completion
        const interval = setInterval(() => {
          chrome.downloads.search({ id: downloadId }, (results) => {
            if (!results || results.length === 0) return;
            const dl = results[0];
            if (dl.state === 'complete') {
              clearInterval(interval);
              resolve();
            } else if (dl.state === 'interrupted') {
              clearInterval(interval);
              reject(new Error(`Download interrupted: ${dl.error}`));
            }
          });
        }, 300);
      }
    );
  });
}
