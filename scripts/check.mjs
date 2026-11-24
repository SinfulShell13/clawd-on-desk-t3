import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const sha256 = data => createHash("sha256").update(data).digest("hex");
export const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function checkPublicText(name, text) {
  const findings = [];
  const rules = [
    ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ["github-token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
    ["provider-key", /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}\b/],
    ["credential-value", /"(?:access_token|refresh_token|client_secret)"\s*:\s*"(?![^"\n]*(?:fixture|example|test|placeholder))[^"\n]{20,}"/i],
  ];
  for (const [rule, pattern] of rules) if (pattern.test(text)) findings.push({ file: name, rule });
  return findings;
}

export function publicPath(name) {
  if (!name || name.includes("\\") || path.posix.isAbsolute(name) || name.split("/").some(part => part === ".." || part === ".git")) return false;
  if (/^(?:work|dist|node_modules|migration|validation|userdata)\//.test(name)) return false;
  if (/(?:^|\/)(?:\.env(?:\..*)?|HANDOFF\.md|clawd-prefs\.json|server-runtime\.json)$/.test(name)) return false;
  return !/\.(?:exe|asar|zip|pem|key|p12|p8|log|db|sqlite3?)$/i.test(name);
}

export function verifyKit(root = kitRoot) {
  const sums = fs.readFileSync(path.join(root, "SHA256SUMS"), "utf8").trim().split(/\r?\n/);
  const files = [];
  const findings = [];
  for (const line of sums) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match || !publicPath(match[2]) || files.includes(match[2])) throw new Error("Invalid public checksum entry");
    const [, hash, name] = match;
    const file = path.resolve(root, ...name.split("/"));
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Linked public file: ${name}`);
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== hash) throw new Error(`Checksum mismatch: ${name}`);
    findings.push(...checkPublicText(name, bytes.toString("utf8")));
    files.push(name);
  }
  if (findings.length) throw new Error(`Public content check failed: ${JSON.stringify(findings)}`);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "adapter.json"), "utf8"));
  if (manifest.distribution !== "source-patch-kit" || manifest.upstream.commit.length !== 40) throw new Error("Invalid adapter manifest");
  if (!files.includes(manifest.patch.file) || sha256(fs.readFileSync(path.join(root, manifest.patch.file))) !== manifest.patch.sha256) throw new Error("Adapter patch is not verified");
  if (sha256(fs.readFileSync(path.join(root, "scripts/profile.mjs"))) !== manifest.profileSha256) throw new Error("Public profile is not verified");
  for (const name of ["LICENSE", "NOTICE.md", "README.md", "README.zh-CN.md", "adapter.json", "package.json", "scripts/setup.mjs", "scripts/profile.mjs", "scripts/check.mjs"]) {
    if (!files.includes(name)) throw new Error(`Missing public file: ${name}`);
  }
  return { ok: true, files, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = verifyKit();
    console.log(JSON.stringify({ ok: true, version: result.manifest.version, files: result.files.length, distribution: result.manifest.distribution }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
