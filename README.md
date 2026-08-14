# dsh-update-checker

[English](README.md) | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) (DSH) web plugin that checks whether your local Harness is up to date — right from Settings.

<img src="assets/screenshot.png" alt="dsh-update-checker screenshot" width="50%" />

> **English**: Check DeepSeek Harness updates from Settings (local `dsh --version` vs npm `latest`/`next`).
>
> **中文**: 在设置页一键自检 DeepSeek Harness 是否有新版本（本地 `dsh --version` vs npm 最新版）。

## Features

- **Update check**: reads the local version via `dsh --version`, compares it with the npm registry `latest` / `next` dist-tags of `@deepseek-ai/dsh`
- **One-click update**: when a new version is found, click a button to run `npx -y @deepseek-ai/dsh@latest` and watch the live install progress in the page
- **Version timeline**: shows the most recent 8 published versions with release dates, highlighting your current version
- **Auto-check & notifications**: re-checks every 6 hours while the Settings page is open; a browser system notification fires when a new version is detected
- **Check history**: the last 10 checks are saved to `~/.dsh/dsh-update-checker-history.json` and shown in the page
- Semantic version comparison (handles `rc` prerelease segments correctly)

## Install

From GitHub (recommended until published to npm):

```sh
dsh plugin --profile web add github:duntansen/dsh-update-checker
```

Then restart `dsh web` and open the GUI. Open **Settings → Update Check** to use it.

> Local development via a link (live sync, restart `dsh web` to reload changes):
> ```sh
> dsh plugin --profile web add link:/absolute/path/to/dsh-update-checker
> ```

## Usage

Open **Settings → Update Check** — a full page with all features:

The page shows:

- **Current / latest / next versions** and a status badge (`✓ up to date` / `⬆ update available`)
- **One-click update** button (`⬇ Update to x.y.z`) when an update is available — shows live terminal output, then prompts to restart `dsh web` when done
- **Version timeline**: the most recent 8 releases with dates, your current version highlighted in green
- **Check history**: recent check times and version transitions
- **Re-check** button and the last check time

Auto-check: the plugin checks when the Settings page opens and then every 6 hours while it stays open. When a new version is detected, a browser notification is fired (the first time, the browser asks for notification permission).

## How it works

- **Host**: registers HTTP routes via the `webServer` service:
  - `GET /dsh-update-check` — local version + npm latest/next + timeline + history
  - `GET /dsh-update-check/status` — live update task output (polled)
  - `POST /dsh-update-check/update` — start the update (same-origin protected, single instance)
- Local version is read with `dsh --version`; npm registry data via global `fetch`. Commands run cross-platform (Windows `cmd.exe` / POSIX `/bin/sh`).
- **Client**: a `settings.section` entry (`__ModuleLoader__` CJS bundle, no build step) that calls the routes above and renders the page.

## Project layout

```
dsh-update-checker/
├── package.json        # dsh bundle patch + web client declaration
├── cordis.patch.yml    # inserts the plugin row into a profile layer stack
├── assets/
│   └── screenshot.png  # README screenshot
└── lib/
    ├── index.js        # host entry: HTTP routes + version comparison
    └── client.js       # client entry: Settings page
```

## License

MIT
