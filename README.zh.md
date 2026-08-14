# dsh-update-checker

[English](README.md) | [中文](README.zh.md)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness)（DSH）Web 插件：在侧边栏一键自检你的 DeepSeek Harness 是否有新版本。

<img src="assets/screenshot.png" alt="dsh-update-checker 截图" width="25%" />

> **中文**: 在侧栏一键自检 DeepSeek Harness 是否有新版本（本地 `dsh --version` vs npm 最新版）。
>
> **English**: Check DeepSeek Harness updates from the sidebar (local `dsh --version` vs npm `latest`/`next`).

## 功能特性

- **版本自检**：通过 `dsh --version` 读取本地版本，对比 npm registry 中 `@deepseek-ai/dsh` 的 `latest` / `next` 通道
- **一键更新**：发现新版本后，点击按钮执行 `npx -y @deepseek-ai/dsh@latest` 拉取最新版，面板实时显示安装进度
- **版本时间线**：展示最近 8 个已发布版本及发布时间，绿色高亮你的当前版本
- **自动检查 + 通知**：每 6 小时后台自动检查；检测到新版本时侧栏按钮出现红色角标，并弹出浏览器系统通知
- **检查历史**：最近 20 次检查记录保存到 `~/.dsh/dsh-update-checker-history.json`，面板内可查看
- 语义化版本比较（正确处理 `rc` 预发布段，如 `0.1.0-rc.6 > 0.1.0-rc.3`）

侧栏底部按钮状态：

| 按钮 | 含义 |
|---|---|
| `⟳` | 空闲（等待中） |
| `…` | 检查中… |
| `⏳` | 更新中… |
| `⬆` | 发现新版本（带红点角标） |
| `⚠` | 检查失败（网络 / 解析） |

## 安装

```sh
dsh plugin --profile web add dsh-update-checker
```

然后重启 `dsh web` 并打开界面，侧栏底部会出现 `⟳` 按钮。

> 源码安装 / 本地开发：
> ```sh
> dsh plugin --profile web add link:/绝对路径/dsh-update-checker
> ```

## 使用方法

点击侧栏底部的 `⟳` 按钮打开面板：

- **当前 / 最新 / next 版本** 与状态徽章（`✓ 已是最新版本` / `⬆ 发现新版本`）
- 有更新时出现**一键更新**按钮（`⬇ 更新到 x.y.z`）——点击后实时显示终端输出，完成后提示重启 `dsh web`
- **版本时间线**：最近 8 个版本及日期，当前版本绿色高亮
- **检查历史**：最近几次检查的时间与版本变化
- **重新检查**按钮和上次检查时间

自动检查：插件加载 1.5 秒后检查一次，之后每 6 小时检查一次。发现新版本时侧栏按钮显示红点，并弹出浏览器通知（首次会请求通知权限）。

## 工作原理

- **Host 端**：通过 `webServer` 服务注册 HTTP 路由：
  - `GET /dsh-update-check` — 本地版本 + npm latest/next + 时间线 + 历史
  - `GET /dsh-update-check/status` — 更新任务实时输出（轮询）
  - `POST /dsh-update-check/update` — 启动更新（同源保护、单实例）
- 本地版本用 `dsh --version` 读取；npm registry 数据用全局 `fetch` 抓取。命令跨平台执行（Windows `cmd.exe` / POSIX `/bin/sh`）。
- **Client 端**：一个 `sidebar.footer.action` 条目（`__ModuleLoader__` CJS bundle，无需构建步骤），调用上述路由并渲染按钮与面板。

## 项目结构

```
dsh-update-checker/
├── package.json        # dsh bundle patch + web client 声明
├── cordis.patch.yml    # 把插件行插入 profile 层栈
├── assets/
│   └── screenshot.png  # README 截图
└── lib/
    ├── index.js        # Host 入口：HTTP 路由 + 版本比较
    └── client.js       # Client 入口：侧栏按钮 + 结果面板
```

## 许可证

MIT
