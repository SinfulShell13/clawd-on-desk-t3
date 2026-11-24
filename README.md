# Clawd for T3 Code — unofficial adapter

[简体中文](README.zh-CN.md)

A source patch kit that connects the existing [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk) pet to **T3 Code's local and already-linked remote sessions**. This is an independent, unofficial preview, not an official Clawd or T3 release.

## What it does

- Shows active sessions, working/waiting states and recently completed results in the existing pet HUD.
- Opens the corresponding local or remote T3 conversation when a row is clicked.
- Handles supported approvals and questions through explicit clicks in the existing bubbles; prompts and run-specific interruption are available from the row menu.
- Groups explicitly related subagents, including cross-provider and cross-environment delegation.
- Displays provider logos and T3's environment machine icons separately.
- Uses the available title width and repairs unexpected native window hiding on Windows.

The adapter does not collect T3 token usage, context percentages or costs. Closing a request bubble, going offline or enabling DND does not submit a decision. Secrets, sign-in flows and unsupported complex questions remain in T3.

## Supported preview

| Item | Verified baseline |
| --- | --- |
| OS / architecture | Windows x64 |
| Clawd source | 1.7.0, commit pinned in `adapter.json` |
| T3 Code | 0.1.12-nightly.20261121.5038, orchestration protocol 2 |
| Build tools | Node.js 24.19.0, npm 12.2.2, Git 2.55.0 |

Other T3 versions may change the CLI launcher, authentication or protocol. macOS, Linux and Windows ARM64 are not verified distributions of this preview. ChatGPT Desktop is not required.

## Why this is a patch kit

Clawd's code is AGPL-3.0, while its character artwork and other assets have separate terms. This public kit contains adapter source changes and explicitly attributed T3/Lucide graphics, **not Clawd's original artwork or a repackaged installer**. Setup retrieves the pinned upstream source on your computer and applies the patch locally. Original asset notices remain in that checkout. Review their terms before redistributing any resulting application or installer.

## Quick start

Install Git, Node.js 24 and T3 Code first. Start T3 and confirm it works normally. Remote sessions require an existing **full-access environment link in T3**; this kit does not configure SSH or deploy a remote Clawd.

### Ask an AI agent to install it (no existing Clawd installation)

Copy this prompt to an AI agent that can run local commands to install from source:

```text
Install and start the Clawd for T3 Code adapter on this Windows x64 computer:
https://github.com/SinfulShell13/clawd-on-desk-t3

Clawd is not installed yet. Follow the README: prepare Git, Node.js 24 and a running T3 Code, clone the repository, run npm run setup, then enter work/app and run npm start. Carry out the installation directly; no original Clawd installation is needed.
```

### Manual installation

Download/extract this patch kit, or clone this repository, then run in its directory:

```powershell
npm run check
npm test
npm run setup
cd work/app
npm start
```

Setup downloads one pinned upstream commit, applies the verified adapter patch, selects fresh-install T3 defaults and installs dependencies with `npm ci`. It does not start Clawd, edit T3 settings, stop tasks or clean up anyone's hooks. It refuses to overwrite an unrelated directory. To choose a new source location:

```powershell
npm run setup -- --app-dir C:\Projects\clawd-t3-local
```

With npm 12, setup permits only the locked Electron, esbuild and Koffi dependency install scripts through a project-local `allowScripts` policy. It does not change your global npm configuration. Installation needs access to GitHub, the npm registry and Electron's binary download host. A failed dependency download can be retried with the same setup command; setup keeps the prepared source.

The default Windows CLI location is `%USERPROFILE%\.t3\bin\t3.cmd`. The official desktop-generated launcher is required by this preview. For a non-default installation set `T3CODE_HOME` and/or `T3CODE_CLI_PATH` in the environment before `npm start`. No credentials belong in this repository.

## Existing Clawd users

Exit every original/source Clawd instance from its tray before starting this build. It deliberately retains Clawd's app identity and user-data location; **the original and adapted versions cannot run side by side**.

Existing themes, preferences and integration choices are preserved. To switch an existing profile to T3-only, enable T3 and disable unneeded native integrations in Settings; existing hooks are not automatically deleted. A fresh profile starts with T3 enabled, native integrations uninstalled/disabled, and the HUD pinned with elapsed time. Usage/quota HUD options and automatic hook management are off by default. Manual permission decisions remain manual.

## Local build and verification

Inside the prepared `work/app` directory:

```powershell
node --test test/t3-client.test.js test/t3-runtime.test.js test/t3-state-projection.test.js test/t3-interactions.test.js test/t3-environment-icons.test.js test/t3-migration.test.js
$env:ELECTRON_RUN_AS_NODE = $null
node node_modules/electron/cli.js scripts/manual/t3-hud-smoke.js
node node_modules/electron/cli.js scripts/manual/pet-window-smoke.js
npm run build:t3:win
```

The resulting Windows installer is a **local personal build**, not an artifact approved for public redistribution. It retains the upstream application's assets and migration backup behavior. Manual updates protect the adapter from an upstream updater overwriting it; no update feed or publisher is configured. Do not upload `work/`, `dist/`, an ASAR, installer, preferences, logs or credentials to the public kit repository.

The kit's GitHub workflow validates only the patch kit. It neither builds nor publishes installers, and requires no publishing secrets. `SHA256SUMS` covers the supplied public files; `npm run check` verifies them and checks for common credential markers. These checks do not grant artwork redistribution rights or prove the absence of every possible secret.

## Known limits

- T3 is polled roughly every four seconds; optional native identity details never hold state publication. Environment icons refresh in the background on a roughly 30-second interval.
- Completed rows normally remain for ten minutes, controlled by Clawd's existing session timeout. Older history does not all enter the HUD.
- No independent T3 dashboard is added. Advanced plan progress, compaction/tool detail and last-response previews are not ported.
- Monitor recovery covers a reproduced native-visibility failure; physical hotplug/GPU behavior is not guaranteed across hardware.
- The broad upstream test suite has not been certified under this T3-only fresh-install profile. Use the adapter checks above; some upstream contracts intentionally assume native integrations are initially enabled.
- The pinned upstream dependency tree has known security advisories. On 2026-11-24, `npm audit` reported 15 affected packages, including Electron; `npm audit --omit=dev` reported four. This preview has not completed an upstream dependency/security upgrade. Run these commands inside `work/app` to check current advisories. Electron is a development dependency for packaging but its runtime is included in a built application, so the production-only audit is not a complete application assessment.

Code is distributed under [AGPL-3.0-only](LICENSE). Preserve upstream authorship and [third-party notices](NOTICE.md). Report the kit version, T3 version, OS and a redacted reproduction when reporting problems; never attach access tokens or your full user-data directory.
