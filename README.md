# Asset Clipper

A Chrome extension that downloads all main-content images from the current page directly into your Obsidian vault, using your active browser session. Designed to work alongside [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper) for sites that serve images behind authentication (e.g. Confluence).

## The problem

Obsidian Web Clipper saves page content as markdown, but images are stored as URLs. For sites like Confluence that require authentication, those URLs only work while you have an active session. Obsidian's internal browser has no access to your Chrome cookies, so images show as broken links.

## The solution

Asset Clipper runs inside Chrome (where your session is active), downloads the images at clip time, and saves them directly to your vault. A companion Obsidian plugin — [Asset Swapper](https://github.com/yourpalmark/asset-swapper) — then rewrites the image URLs in the clipped note to point to the local files.

## Workflow

1. Open a page in Chrome (e.g. a Confluence page you're logged into)
2. Clip the page with Obsidian Web Clipper → markdown saved to `raw/`
3. Click the Asset Clipper toolbar button → images downloaded to `raw/assets/<Page Title>/`
4. In Obsidian, run **Asset Swapper: Swap all assets for current file** → URLs rewritten to local wikilinks

## Installation

Asset Clipper is not yet published to the Chrome Web Store. To install it manually:

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the `asset-clipper` folder

## Configuration

Chrome extensions can only save files relative to your system's **Downloads folder** (this is a Chrome security restriction — extensions cannot write to arbitrary paths).

To make this work seamlessly:

1. In Chrome, go to **Settings → Downloads** and set your download location to your Obsidian vault path (e.g. `/Users/you/Documents/MyVault`)
2. Click the ⚙ icon in the Asset Clipper popup and leave the vault path field **empty** (or set it to a subfolder if your vault isn't the download root)

Images are saved to: `<downloads folder>/raw/assets/<Page Title>/`

Alternatively, you can keep your normal Downloads folder and set the vault path in Asset Clipper to the relative path from Downloads to your vault (e.g. `../Documents/MyVault` — though this may not work on all systems).

The most reliable setup is to point Chrome's download location directly at your vault.

## Notes

- Only images in the main content area of the page are downloaded (nav icons, logos, etc. are excluded)
- Filenames are URL-decoded (spaces are restored, encoded characters are resolved)
- If the same filename already exists in the destination folder, it will be overwritten
