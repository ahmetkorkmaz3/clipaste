import { execFile } from "node:child_process";
import x11 from "x11";

const TIMEOUT_MS = 1500;

function run(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: TIMEOUT_MS, windowsHide: true }, (error, stdout) => {
      if (error) reject(error);
      else resolve(String(stdout));
    });
  });
}

/** Reads the class name from a WM_CLASS value ("instance\0Class\0"), for example "firefox". */
export function parseWmClass(data) {
  const values = Buffer.from(data).toString("latin1").split("\0").filter(Boolean);
  return values.at(-1) || null;
}

/** Parses the output of `lsappinfo info -only name <asn>`. */
export function parseLsappinfoName(output) {
  const match = /"LSDisplayName"="([^"]*)"/.exec(output);
  return match ? match[1] : null;
}

/** Converts a window class such as "google-chrome" to "Google Chrome". */
export function prettifyAppName(name) {
  if (!name) return null;
  const words = name.replace(/\.(exe|app)$/i, "").split(/[-_.\s]+/).filter(Boolean);
  if (words.length === 0) return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

const X_ATOM_WINDOW = 33;
const X_ATOM_STRING = 31;
const X_ATOM_WM_CLASS = 67;

// One X11 connection stays open, so a lookup costs only two round trips.
// This talks to the X server directly. It needs no helper tools, also inside the snap.
let x11Session = null;

function withTimeout(promise) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS).unref())]);
}

function connectX11() {
  return new Promise((resolve, reject) => {
    x11.createClient((error, display) => {
      if (error) return reject(error);
      const X = display.client;
      const reset = () => {
        x11Session = null;
      };
      X.on("error", reset);
      X.on("end", reset);
      X.InternAtom(false, "_NET_ACTIVE_WINDOW", (err, atom) => {
        if (err) return reject(err);
        resolve({ X, root: display.screen[0].root, activeWindowAtom: atom });
      });
    });
  });
}

function getProperty(X, window, atom, type, length) {
  return new Promise((resolve, reject) => {
    X.GetProperty(0, window, atom, type, 0, length, (error, prop) => (error ? reject(error) : resolve(prop.data)));
  });
}

async function linuxSourceApp() {
  if (!process.env.DISPLAY) return null;
  x11Session ??= withTimeout(connectX11()).catch((error) => {
    x11Session = null;
    throw error;
  });
  const { X, root, activeWindowAtom } = await x11Session;

  const active = await withTimeout(getProperty(X, root, activeWindowAtom, X_ATOM_WINDOW, 1));
  const window = active.length >= 4 ? active.readUInt32LE(0) : 0;
  if (!window) return null;

  const wmClass = await withTimeout(getProperty(X, window, X_ATOM_WM_CLASS, X_ATOM_STRING, 64));
  return prettifyAppName(parseWmClass(wmClass));
}

/** Closes the X11 connection. The app keeps it open. Tests use this to exit. */
export async function closeX11() {
  const session = await x11Session?.catch(() => null);
  x11Session = null;
  session?.X.terminate();
}

async function macSourceApp() {
  const asn = (await run("lsappinfo", ["front"])).trim();
  if (!asn) return null;
  return parseLsappinfoName(await run("lsappinfo", ["info", "-only", "name", asn]));
}

const WINDOWS_SCRIPT = `
Add-Type -Name W -Namespace U -MemberDefinition '
[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
[DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int p);'
$p = 0
[void][U.W]::GetWindowThreadProcessId([U.W]::GetForegroundWindow(), [ref]$p)
$proc = Get-Process -Id $p
$desc = $proc.MainModule.FileVersionInfo.FileDescription
if ($desc) { $desc } else { $proc.ProcessName }
`;

async function windowsSourceApp() {
  const output = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_SCRIPT]);
  return output.trim() || null;
}

/**
 * Returns the name of the application that has focus, or null when the
 * platform does not make it available (for example, a native Wayland window).
 * This function never throws.
 */
export async function getSourceApp(platform = process.platform) {
  try {
    if (platform === "linux") return await linuxSourceApp();
    if (platform === "darwin") return await macSourceApp();
    if (platform === "win32") return await windowsSourceApp();
  } catch {
    // The helper tool is missing or failed. The source stays unknown.
  }
  return null;
}
