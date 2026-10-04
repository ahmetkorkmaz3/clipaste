# Changelog

All notable changes to Clipaste are in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Homebrew cask for macOS: `brew install --cask ahmetkorkmaz3/tap/clipaste`.

## [2.0.0] - 2026-10-04

Clipaste 2.0 is a full rewrite on Electron 44. Your 1.x history is imported automatically on the first start.

### Added

- Each item shows the app you copied it from, and the time.
- Search the history by text or app name.
- Pin items. Pinned items are never trimmed and stay when you clear the history.
- Keyboard navigation: arrow keys, <kbd>Enter</kbd> to copy, <kbd>Delete</kbd> to delete, <kbd>Esc</kbd> to hide.
- Links in the history open in your browser with one click.
- Dark theme that follows the system theme.
- Tray menu with the five recent items, Pause Recording, Hide After Copy, Start at Login and History Size.
- `clipaste --toggle` command. Use it for a custom shortcut on Wayland.
- `--hidden` option to start in the tray.
- Packages for macOS (universal `.dmg`), Windows (`.exe`) and Linux (`.AppImage`, `.deb`), in addition to the snap.
- Website at <https://ahmetkorkmaz3.github.io/clipaste/>.

### Changed

- The history file moved to the app data folder (`history.json`). Clipaste renames the old `~/.clipaste.json` to `~/.clipaste.json.migrated` after the import.
- A copy of a text that is already in the history moves that item to the top. It does not add a second copy.
- The history keeps 200 items by default. You can change this in the tray menu.
- The window opens on the screen with the mouse pointer and does not cover the top panel.
- The snap uses the `core24` base.
- Removed the jQuery, SweetAlert2 and shortid dependencies.

### Fixed

- Security: copied text was inserted as HTML in a window with Node.js access. A copied text such as `<img onerror=…>` could run code. The text now shows as plain text, and the window runs in a sandbox without Node.js access.
- The copy button added spaces and line breaks around the text.
- An item copied from Clipaste was added to the history again.
- A second start of the app opened a second tray icon and recorded each item two times.
- Clipaste did not start on current Electron versions (`remote` module removed).
- On Wayland, Clipaste could not read the clipboard in the background.
- Text that password managers mark as concealed is no longer recorded.

## [1.0.0] - 2020-04-03

First release on the Snap Store.

[2.0.0]: https://github.com/ahmetkorkmaz3/clipaste/releases/tag/v2.0.0
[1.0.0]: https://snapcraft.io/clipaste
