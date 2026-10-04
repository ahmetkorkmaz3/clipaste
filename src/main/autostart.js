import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

// Inside a snap, HOME points to $SNAP_USER_DATA. snapd reads the autostart
// entry from there because the snap declares `autostart: clipaste.desktop`.
const desktopFile = () => path.join(homedir(), ".config", "autostart", "clipaste.desktop");

function linuxExec() {
  if (process.env.SNAP) return "clipaste";
  if (process.env.APPIMAGE) return `"${process.env.APPIMAGE}"`;
  return `"${process.execPath}"`;
}

export function isAutostartEnabled(app) {
  if (process.platform === "linux") return existsSync(desktopFile());
  return app.getLoginItemSettings().openAtLogin;
}

export function setAutostart(app, enabled) {
  if (process.platform !== "linux") {
    app.setLoginItemSettings({ openAtLogin: enabled, openAsHidden: true });
    return;
  }

  const file = desktopFile();
  if (!enabled) {
    rmSync(file, { force: true });
    return;
  }
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    [
      "[Desktop Entry]",
      "Type=Application",
      "Name=Clipaste",
      "Comment=Clipboard manager",
      `Exec=${linuxExec()} --hidden`,
      "Icon=clipaste",
      "X-GNOME-Autostart-enabled=true",
      "",
    ].join("\n"),
  );
}
