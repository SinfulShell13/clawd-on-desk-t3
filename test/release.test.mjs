import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { verifyKit, kitRoot, sha256, publicPath, checkPublicText } from "../scripts/check.mjs";
import { configureApplication } from "../scripts/profile.mjs";
import { prepareApplication } from "../scripts/setup.mjs";

test("every public file is checksummed and the application patch excludes restricted upstream art", () => {
  const { manifest, files } = verifyKit();
  assert.equal(manifest.distribution, "source-patch-kit");
  assert.ok(files.every(publicPath));
  const allowed = new Set(["assets/icons/agents/t3-code.png", "assets/source/agent-icons/t3-code.png", "assets/source/agent-icons/source-manifest.json"]);
  const patch = fs.readFileSync(path.join(kitRoot, manifest.patch.file), "utf8");
  const paths = [...patch.matchAll(/^diff --git a\/(.+) b\/(.+)$/gm)].map(match => match[2]);
  assert.ok(paths.includes("src/t3-runtime.js"));
  assert.ok(paths.includes("src/main.js"));
  assert.ok(paths.filter(name => name.startsWith("assets/")).every(name => allowed.has(name)));
  assert.ok(!paths.some(name => /^(?:docs|distribution)\//.test(name) || name === "AGENTS.md"));
});

test("public paths cannot include an installer, credentials, user data or traversal", () => {
  for (const name of ["../config", "/etc/passwd", "a\\file", "work/app/src/main.js", "userdata/database.db", "file.exe", "file.asar", ".env", "HANDOFF.md", ".git/config"]) assert.equal(publicPath(name), false, name);
  assert.equal(publicPath("patches/clawd-t3.patch"), true);
});

test("credential checks report only rule/file names, not matched values", () => {
  const token = "ghp_" + "a".repeat(40);
  const findings = checkPublicText("example.txt", token);
  assert.deepEqual(findings, [{ file: "example.txt", rule: "github-token" }]);
  assert.ok(!JSON.stringify(findings).includes(token));
});

function profileFixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "t3-public-profile-"));
  t.after(() => { assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep)); fs.rmSync(root, { recursive: true, force: true }); });
  fs.mkdirSync(path.join(root, "src"));
  const prefs = `module.exports = {
    agents: { "claude-code": { integrationInstalled: true, enabled: true, permissionsEnabled: true },
      "codex": { integrationInstalled: true, enabled: true, permissionsEnabled: true } },
    manageClaudeHooksAutomatically: { type: "boolean", default: true },
    autoUpdateCheck: { type: "boolean", default: true },
    sessionHudShowElapsed: { type: "boolean", default: false },
    sessionHudPinned: { type: "boolean", default: false },
    sessionHudShowContextUsage: { type: "boolean", default: true },
    sessionHudShowQuota: { type: "boolean", default: true }
  };`;
  const pkg = { version: "1.7.0", scripts: {}, build: { publish: [{ provider: "github", owner: "upstream" }], appId: "com.clawd.on-desk" } };
  const lock = { version: "1.7.0", packages: { "": { version: "1.7.0" }, dependency: { resolved: "https://registry.npmmirror.com/example/-/example-1.tgz", integrity: "unchanged-fixture" },
    "node_modules/electron": { version: "41.10.4", hasInstallScript: true },
    "node_modules/unreviewed": { version: "1.0.0", hasInstallScript: true } } };
  for (const [name, data] of [["src/prefs.js", prefs], ["package.json", JSON.stringify(pkg)], ["package-lock.json", JSON.stringify(lock)]]) fs.writeFileSync(path.join(root, name), data);
  fs.writeFileSync(path.join(root, "existing-user-preferences.json"), '{"theme":"custom","agents":{"codex":{"enabled":true}}}');
  const manifest = { version: "0.1.0-preview.1", applicationVersion: "1.7.0-t3.0.1", distribution: "source-patch-kit",
    profileInputs: Object.fromEntries(["src/prefs.js", "package.json", "package-lock.json"].map(name => [name, sha256(fs.readFileSync(path.join(root, name)))])) };
  return { root, manifest };
}

test("fresh public defaults use T3-only without overwriting stored user preferences or lock integrity", t => {
  const { root, manifest } = profileFixture(t);
  const before = fs.readFileSync(path.join(root, "existing-user-preferences.json"));
  configureApplication(root, manifest);
  const context = { module: { exports: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(root, "src/prefs.js"), "utf8"), context);
  const prefs = context.module.exports;
  assert.ok(Object.values(prefs.agents).every(agent => !agent.enabled && !agent.integrationInstalled && agent.permissionsEnabled));
  assert.equal(prefs.manageClaudeHooksAutomatically.default, false);
  assert.equal(prefs.sessionHudPinned.default, true);
  assert.equal(prefs.sessionHudShowElapsed.default, true);
  assert.equal(prefs.sessionHudShowQuota.default, false);
  assert.deepEqual(fs.readFileSync(path.join(root, "existing-user-preferences.json")), before);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json")));
  assert.equal(pkg.build.publish, undefined);
  assert.equal(pkg.build.appId, "com.clawd.on-desk");
  assert.equal(pkg.version, manifest.applicationVersion);
  assert.equal(pkg.allowScripts["electron@41.10.4"], true);
  assert.equal(pkg.allowScripts["unreviewed@1.0.0"], false);
  const lock = JSON.parse(fs.readFileSync(path.join(root, "package-lock.json")));
  assert.equal(lock.packages.dependency.integrity, "unchanged-fixture");
  assert.ok(lock.packages.dependency.resolved.startsWith("https://registry.npmjs.org/"));
});

test("profile refuses an unexpected application before writing files", t => {
  const { root, manifest } = profileFixture(t);
  const file = path.join(root, "src/prefs.js");
  fs.appendFileSync(file, "\n// user modification");
  const before = fs.readFileSync(file);
  assert.throws(() => configureApplication(root, manifest), /Unexpected profile input/);
  assert.deepEqual(fs.readFileSync(file), before);
});

test("Windows CRLF does not invalidate canonical source hashes", t => {
  const { root, manifest } = profileFixture(t);
  const file = path.join(root, "src/prefs.js");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/\n/g, "\r\n"));
  assert.equal(configureApplication(root, manifest).freshInstall, "T3-only");
});

test("setup refuses unrelated existing files instead of resetting or deleting them", t => {
  const { root } = profileFixture(t);
  const before = fs.readFileSync(path.join(root, "existing-user-preferences.json"));
  assert.throws(() => prepareApplication({ appDir: root, install: false }), /not empty/);
  assert.deepEqual(fs.readFileSync(path.join(root, "existing-user-preferences.json")), before);
});
