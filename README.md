# dsh-update-checker

[English](README.md) | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) (DSH) web plugin that checks whether your local Harness is up to date — right from the sidebar.

<img src="assets/screenshot.png" alt="dsh-update-checker screenshot" width="25%" />

> **English**: Check DeepSeek Harness updates from the sidebar (local `dsh --version` vs npm `latest`/`next`).
>
> **中文**: 在侧栏一键自检 DeepSeek Harness 是否有新版本（本地 `dsh --version` vs npm 最新版）。

## Features

- **Update check**: reads the local version via `dsh --version`, compares it with the npm registry `latest` / `next` dist-tags of `@deepseek-ai/dsh`
- **One-click update**: when a new version is found, click a button to run `npx -y @deepseek-ai/dsh@latest` and watch the live install progress in the panel
- **Version timeline**: shows the most recent 8 published versions with release dates, highlighting your current version
- **Auto-check & notifications**: re-checks every 6 hours in the background; a red badge appears on the sidebar button and a browser system notification fires when a new version is detected
- **Check history**: the last 20 checks are saved to `~/.dsh/dsh-update-checker-history.json` and shown in the panel
- Semantic version comparison (handles `rc` prerelease segments correctly)

Sidebar footer button states:

| Button | Meaning |
|---|---|
| `⟳` | idle (waiting) |
| `…` | checking… |
| `⏳` | updating… |
| `⬆` | new version available (with red dot badge) |
| `⚠` | check failed (network / parse) |

## Install

```sh
dsh plugin --profile web add dsh-update-checker
```

Then restart `dsh web` and open the GUI. A `⟳` button appears at the bottom of the sidebar.

> Installing from source / local development:
> ```sh
> dsh plugin --profile web add link:/absolute/path/to/dsh-update-checker
> ```

## Usage

Click the `⟳` button at the sidebar footer to open the panel:

- **Current / latest / next versions** and a status badge (`✓ up to date` / `⬆ update available`)
- **One-click update** button (`⬇ Update to x.y.z`) when an update is available — shows live terminal output, then prompts to restart `dsh web` when done
- **Version timeline**: the most recent 8 releases with dates, your current version highlighted in green
- **Check history**: recent check times and version transitions
- **Re-check** button and the last check time

Auto-check: the plugin checks once 1.5s after loading and then every 6 hours. When a new version is detected, the sidebar button shows a red dot and a browser notification is fired (the first time, the browser asks for notification permission).

## How it works

- **Host**: registers HTTP routes via the `webServer` service:
  - `GET /dsh-update-check` — local version + npm latest/next + timeline + history
  - `GET /dsh-update-check/status` — live update task output (polled)
  - `POST /dsh-update-check/update` — start the update (same-origin protected, single instance)
- Local version is read with `dsh --version`; npm registry data via global `fetch`. Commands run cross-platform (Windows `cmd.exe` / POSIX `/bin/sh`).
- **Client**: a `sidebar.footer.action` entry (`__ModuleLoader__` CJS bundle, no build step) that calls the routes above and renders the button + panel.

## Project layout

```
dsh-update-checker/
├── package.json        # dsh bundle patch + web client declaration
├── cordis.patch.yml    # inserts the plugin row into a profile layer stack
├── assets/
│   └── screenshot.png  # README screenshot
└── lib/
    ├── index.js        # host entry: HTTP routes + version comparison
    └── client.js       # client entry: sidebar button + result panel
```

## License

MIT
