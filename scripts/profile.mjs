import fs from "node:fs";
import path from "node:path";
import { sha256 } from "./check.mjs";

function replaceOnce(text, from, to) {
  if (text.split(from).length !== 2) throw new Error("The pinned application's defaults no longer match this preview");
  return text.replace(from, to);
}

export function configureApplication(root, manifest) {
  for (const [name, hash] of Object.entries(manifest.profileInputs)) {
    const canonical = fs.readFileSync(path.join(root, name), "utf8").replace(/\r\n/g, "\n");
    if (sha256(canonical) !== hash) throw new Error(`Unexpected profile input: ${name}`);
  }
  const prefsPath = path.join(root, "src/prefs.js");
  let prefs = fs.readFileSync(prefsPath, "utf8");
  for (const agent of ["claude-code", "codex"]) prefs = replaceOnce(prefs,
    `"${agent}": { integrationInstalled: true, enabled: true,`,
    `"${agent}": { integrationInstalled: false, enabled: false,`);
  prefs = replaceOnce(prefs, 'manageClaudeHooksAutomatically: { type: "boolean", default: true }', 'manageClaudeHooksAutomatically: { type: "boolean", default: false }');
  prefs = replaceOnce(prefs, 'autoUpdateCheck: { type: "boolean", default: true }', 'autoUpdateCheck: { type: "boolean", default: false }');
  for (const [key, before, after] of [["sessionHudShowElapsed", false, true], ["sessionHudPinned", false, true],
    ["sessionHudShowContextUsage", true, false], ["sessionHudShowQuota", true, false]]) {
    prefs = replaceOnce(prefs, `${key}: { type: "boolean", default: ${before} }`, `${key}: { type: "boolean", default: ${after} }`);
  }
  fs.writeFileSync(prefsPath, prefs);

  const pkgPath = path.join(root, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const lockPath = path.join(root, "package-lock.json");
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  pkg.version = manifest.applicationVersion;
  pkg.description = "Unofficial Clawd on Desk adapter for T3 Code (personal local build)";
  pkg.t3Adapter = { version: manifest.version, distribution: manifest.distribution };
  pkg.scripts.build = pkg.scripts["build:win:x64"] = "node build/build-t3-windows.js";
  // Personal builds have no publisher or update feed. App identity stays the
  // same so existing users keep their preferences; the two apps cannot co-run.
  delete pkg.build.publish;
  // npm 12 blocks unreviewed dependency lifecycle scripts. Approve only the
  // locked Electron/esbuild/Koffi installers needed by this Windows preview.
  // Squirrel packaging and protobuf's optional postinstall are not required.
  const scriptPolicy = { electron: true, esbuild: true, koffi: true, "electron-winstaller": false, protobufjs: false };
  pkg.allowScripts = {};
  for (const [name, entry] of Object.entries(lock.packages || {})) if (name && entry.hasInstallScript) {
    const identity = name.slice(name.lastIndexOf("node_modules/") + "node_modules/".length);
    pkg.allowScripts[`${identity}@${entry.version}`] = scriptPolicy[identity] === true;
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  lock.version = pkg.version;
  if (lock.packages?.[""]) lock.packages[""].version = pkg.version;
  for (const entry of Object.values(lock.packages || {})) {
    if (typeof entry.resolved === "string") entry.resolved = entry.resolved.replace(/^https:\/\/registry\.npmmirror\.com\//, "https://registry.npmjs.org/");
  }
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
  return { freshInstall: "T3-only", existingPreferences: "preserved", updates: "manual", applicationVersion: pkg.version };
}
