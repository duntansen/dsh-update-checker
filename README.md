# dsh-update-checker

[English](README.md) | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) (DSH) web plugin that checks whether your local Harness is up to date — right from the sidebar.

## Features

- Reads the local version via `dsh --version`
- Queries the npm registry for `latest` / `next` dist-tags of `@deepseek-ai/dsh`
- Semantic version comparison (handles `rc` prerelease segments correctly)
- Sidebar footer button states: `⟳` idle / `…` checking / `⬆` update available / `⚠` error
- Click to open a panel: local version, latest version, next channel, status badge, check time, re-check button
- Auto-checks once 1.5s after the plugin loads

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

Click the `⟳` button at the sidebar footer:

| Button | Meaning |
|---|---|
| `⟳` | idle (waiting) |
| `…` | checking… |
| `⬆` | new version available |
| `⚠` | check failed (network / parse) |

The panel shows **current version**, **latest version**, **next channel**, and a status badge (`✓ up to date` / `⬆ update available`), plus the check time and a *Re-check* button.

## How it works

- **Host**: registers an HTTP route `/dsh-update-check` via the `webServer` service. Local version is read with Node's `execFileSync('dsh --version')`; npm registry data via global `fetch`.
- **Client**: a `sidebar.footer.action` entry (`__ModuleLoader__` CJS bundle, no build step) that calls `fetch('/dsh-update-check')` and renders the button + panel.

## Project layout

```
dsh-update-checker/
├── package.json        # dsh bundle patch + web client declaration
├── cordis.patch.yml    # inserts the plugin row into a profile layer stack
└── lib/
    ├── index.js        # host entry: HTTP route + version comparison
    └── client.js       # client entry: sidebar button + result panel
```

## License

MIT
