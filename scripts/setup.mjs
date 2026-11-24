import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { kitRoot, verifyKit, sha256 } from "./check.mjs";
import { configureApplication } from "./profile.mjs";

export function prepareApplication({ root = kitRoot, appDir = path.join(root, "work/app"), source, install = true } = {}) {
  const { manifest } = verifyKit(root);
  appDir = path.resolve(appDir);
  if (appDir === path.parse(appDir).root || root === appDir || root.startsWith(appDir + path.sep)) throw new Error("Choose a separate application directory");
  const marker = path.join(appDir, ".t3-adapter-setup.json");
  let prepared = false;
  if (fs.existsSync(appDir)) {
    if (fs.lstatSync(appDir).isSymbolicLink()) throw new Error("Application directory cannot be a link");
    if (fs.existsSync(marker)) {
      const state = JSON.parse(fs.readFileSync(marker, "utf8"));
      if (state.patch !== manifest.patch.sha256 || state.version !== manifest.version || state.profileSha256 !== manifest.profileSha256) throw new Error("This directory contains another adapter version; choose a new directory");
      if (sha256(fs.readFileSync(path.join(appDir, "package.json"))) !== state.configuredPackage) throw new Error("Application package was changed; review it before installing dependencies");
      prepared = true;
    } else if (fs.readdirSync(appDir).length) throw new Error("Application directory is not empty; no existing files were changed");
  }
  const git = args => execFileSync("git", args, { cwd: appDir, encoding: "utf8", windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }, stdio: ["ignore", "pipe", "pipe"] }).trim();
  if (!prepared) {
    fs.mkdirSync(appDir, { recursive: true });
    git(["init", "--quiet"]);
    git(["config", "core.autocrlf", "false"]);
    git(["-c", "core.autocrlf=false", "fetch", "--quiet", "--no-tags", "--depth=1", source || manifest.upstream.repository, manifest.upstream.commit]);
    if (git(["rev-parse", "FETCH_HEAD"]) !== manifest.upstream.commit) throw new Error("Unexpected upstream commit");
    git(["-c", "core.autocrlf=false", "checkout", "--quiet", "--detach", "FETCH_HEAD"]);
    const patch = path.resolve(root, manifest.patch.file);
    git(["apply", "--check", patch]);
    git(["apply", patch]);
    const profile = configureApplication(appDir, manifest);
    const state = { version: manifest.version, patch: manifest.patch.sha256, profileSha256: manifest.profileSha256, upstream: manifest.upstream.commit, profile,
      configuredPackage: sha256(fs.readFileSync(path.join(appDir, "package.json"))) };
    fs.writeFileSync(marker, JSON.stringify(state, null, 2) + "\n");
  }
  if (install) {
    const npm = process.env.npm_execpath;
    if (!npm || !fs.existsSync(npm)) throw new Error("Source is prepared. Run this command through npm run setup, or run npm ci in the application directory");
    const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
    execFileSync(process.execPath, [npm, "ci"], { cwd: appDir, stdio: "inherit", windowsHide: true, env });
  }
  return { ok: true, appDir, alreadyPrepared: prepared, dependenciesInstalled: install };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("This preview requires Node.js 24 or newer");
    let appDir, source, install = true;
    for (let index = 2; index < process.argv.length; index++) {
      const arg = process.argv[index];
      if (arg === "--app-dir" || arg === "--source") {
        const value = process.argv[++index];
        if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}`);
        if (arg === "--app-dir") appDir = value; else source = value;
      }
      else if (arg === "--skip-install") install = false;
      else throw new Error("Unknown setup argument");
    }
    console.log(JSON.stringify(prepareApplication({ appDir, source, install })));
    console.log("Open the prepared application directory and run npm start. Exit an existing Clawd instance first.");
  } catch (error) {
    // Git/npm failures can include local paths. They are shown only on this
    // user's console, never copied into this public patch kit or a report.
    console.error(error.message); process.exitCode = 1;
  }
}
