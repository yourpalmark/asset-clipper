# Changelog

## [Unreleased]

### Changed
- Recolored extension icon to teal (`#00b4c8`) to distinguish from Batch Clipper
- Removed `generate_icons.py` (cairosvg-based); `generate_icons.js` (sharp-based) is the canonical icon generator

## [1.0.0] - 2025-05-13

### Added
- Initial release: download page assets to an Obsidian vault using the active browser session
- File System Access API integration for writing directly to the vault folder
- Authenticated asset downloading (images, CSS, fonts, scripts) via fetch with cookies
- Asset URL rewriting in generated Markdown
- Done button closes popup after download completes
- Vault folder highlighted in green when a location is set
- Vault permission re-grant folded into Download click (no separate Reconnect step)
- Assets pulled from anchor `<a>` links in addition to embedded resources
