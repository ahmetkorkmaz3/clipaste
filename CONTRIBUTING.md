# Contributing to Clipaste

Thank you for your help. Bug reports, ideas and pull requests are welcome.

## Report a bug or request a feature

Use the [issue forms](https://github.com/ahmetkorkmaz3/clipaste/issues/new/choose). For a bug, give your system, the Clipaste version and the steps that cause the problem.

## Set up the project

You need Node.js 22 or later.

```sh
npm install
npm start
npm test
```

## Project layout

| Path                     | Content                                                        |
| ------------------------ | -------------------------------------------------------------- |
| `src/main/main.js`       | Main process: window, tray, shortcut, clipboard polling, IPC   |
| `src/main/history.js`    | History logic (add, move to top, pin, limit). No Electron code |
| `src/main/storage.js`    | JSON storage with lowdb and the import of the 1.x history      |
| `src/main/source-app.js` | Finds the app that has the focus (X11, macOS, Windows)         |
| `src/main/autostart.js`  | Start at login                                                 |
| `src/preload.cjs`        | The small API that the window can use                          |
| `src/renderer/`          | The window (HTML, CSS, JavaScript)                             |
| `test/`                  | Tests for `node --test`                                        |
| `website/`               | The website on GitHub Pages                                    |

The window runs in a sandbox without Node.js access. Always show clipboard content with `textContent`, never with `innerHTML`.

## Pull requests

1. Make a branch from `master`.
2. Add or update the tests for your change.
3. Make sure that `npm test` passes.
4. Add a line to the `Unreleased` section of `CHANGELOG.md`.

## Release a new version

The `Release` workflow builds the packages, creates the GitHub release and publishes the snap.

1. Update `version` in `package.json` and run `npm install` to update the lock file.
2. Move the `Unreleased` notes in `CHANGELOG.md` to a new version section, for example `## [2.1.0] - 2026-11-01`.
3. Merge the change to `master`.
4. Push a tag: `git tag v2.1.0 && git push origin v2.1.0`.

The tag must match the version in `package.json`. The workflow uses the version section of `CHANGELOG.md` as the release notes.

### Snap Store credentials

The workflow needs the `SNAPCRAFT_STORE_CREDENTIALS` repository secret to publish the snap. To create it:

1. Install snapcraft (`sudo snap install snapcraft --classic` on Linux, `brew install snapcraft` on macOS).
2. Export a login that can only publish Clipaste:

   ```sh
   snapcraft export-login --snaps=clipaste \
     --acls package_access,package_push,package_update,package_release \
     --expires 2027-10-01 credentials.txt
   ```

3. Save the file content as a secret: `gh secret set SNAPCRAFT_STORE_CREDENTIALS < credentials.txt`.
4. Delete `credentials.txt`.

The credentials expire on the date you give. Make new credentials before that date.
