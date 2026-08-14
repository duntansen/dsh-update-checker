window.__ModuleLoader__.load({ id: "dsh-update-checker", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
'use strict'

/**
 * dsh-update-checker client: sidebar footer button that checks DeepSeek
 * Harness for updates, with one-click update, version timeline, auto-check
 * notifications, and check history.
 * Hand-authored CJS bundle (no build step).
 */
const React = require('react')
const h = React.createElement
const { useState, useEffect, useRef } = React

exports.name = 'dsh-update-checker'
exports.inject = ['slots']
exports.apply = function apply(ctx) {
  const css = `
    .upd-btn {
      border: none;
      background: none;
      color: var(--dsw-alias-label-secondary, #888);
      cursor: pointer;
      font-size: 13px;
      padding: 2px 5px;
      border-radius: 6px;
      line-height: 1.2;
      position: relative;
    }
    .upd-btn:hover {
      background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.14));
      color: var(--dsw-alias-label-primary, #333);
    }
    .upd-btn:disabled { opacity: 0.5; cursor: default; }
    .upd-row {
      display: flex;
      justify-content: space-between;
      padding: 3px 0;
      border-bottom: 1px dashed var(--dsw-alias-border-l1, rgba(128,128,128,0.2));
    }
    .upd-row:last-of-type { border-bottom: none; }
    .upd-row .k { color: var(--dsw-alias-label-secondary, #888); }
    .upd-row .v { font-variant-numeric: tabular-nums; font-weight: 600; }
    .upd-badge {
      margin-top: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      font-weight: 600;
      text-align: center;
    }
    .upd-badge[data-new='true'] {
      background: rgba(74, 222, 128, 0.18);
      color: var(--dsw-alias-state-success-primary, #16a34a);
    }
    .upd-badge[data-new='false'] {
      background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12));
      color: var(--dsw-alias-label-secondary, #888);
    }
    .upd-badge[data-err='true'] {
      background: rgba(248, 113, 113, 0.15);
      color: var(--dsw-alias-state-error-primary, #dc2626);
    }
    .upd-foot {
      margin-top: 8px;
      font-size: 10px;
      color: var(--dsw-alias-label-secondary, #888);
      text-align: center;
    }
    .upd-section {
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.25));
    }
    .upd-section-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--dsw-alias-label-secondary, #888);
      margin-bottom: 6px;
      letter-spacing: 0.04em;
    }
    .upd-tl-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      font-size: 11px;
    }
    .upd-tl-item .ver { font-variant-numeric: tabular-nums; font-weight: 600; }
    .upd-tl-item .time { color: var(--dsw-alias-label-secondary, #888); }
    .upd-tl-item[data-current='true'] .ver { color: var(--dsw-alias-state-success-primary, #16a34a); }
    .upd-hist-item {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
      font-size: 10px;
      color: var(--dsw-alias-label-secondary, #888);
    }
    .upd-update-btn {
      margin-top: 10px;
      width: 100%;
      border: 1px solid var(--dsw-alias-state-success-primary, #16a34a);
      background: rgba(74, 222, 128, 0.14);
      color: var(--dsw-alias-state-success-primary, #16a34a);
      border-radius: 8px;
      padding: 7px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .upd-update-btn:hover { background: rgba(74, 222, 128, 0.24); }
    .upd-update-btn:disabled { opacity: 0.6; cursor: default; }
    .upd-progress {
      margin-top: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12));
      font-size: 10px;
      color: var(--dsw-alias-label-secondary, #888);
      font-family: ui-monospace, 'Cascadia Code', Consolas, monospace;
      max-height: 120px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
  `
  function injectStyles() {
    if (document.querySelector('style[data-plugin-css="dsh-update-checker"]') !== null) return
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-update-checker'
    tag.dataset.pluginCss = 'dsh-update-checker'
    tag.textContent = css
    document.head.appendChild(tag)
  }
  ctx.effect(() => {
    injectStyles()
    return () => {
      const tag = document.querySelector('style[data-plugin-css="dsh-update-checker"]')
      if (tag) tag.remove()
    }
  }, 'dsh-update-checker: styles')

  const AUTO_CHECK_MS = 6 * 60 * 60 * 1000 // 6 小时自动检查

  function fmtTime(ts) {
    if (!ts) return '—'
    const d = new Date(ts)
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
  }

  function fmtDate(iso) {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  }

  /** 检查面板主体 */
  function PanelBody(p) {
    const { state, busy, badgeErr, badgeNew, updating, updateLog, startUpdate, doCheck } = p
    const d = state && state.data
    return h('div', null,
      busy
        ? h('div', { className: 'upd-foot' }, '检查中…')
        : badgeErr
          ? h('div', { className: 'upd-badge', 'data-err': 'true' }, '检查失败：无法连接或解析')
          : d && h('div', null,
              h('div', { className: 'upd-row' }, h('span', { className: 'k' }, '当前版本'), h('span', { className: 'v' }, d.local || '未知')),
              h('div', { className: 'upd-row' }, h('span', { className: 'k' }, '最新版本'), h('span', { className: 'v' }, d.latest || '未知')),
              h('div', { className: 'upd-row' }, h('span', { className: 'k' }, 'next 通道'), h('span', { className: 'v' }, d.next || '—')),
              h('div', { className: 'upd-badge', 'data-new': String(!!badgeNew) },
                d.hasUpdate ? '⬆ 发现新版本，可以去更新啦！' : '✓ 已是最新版本'),
              d.hasUpdate && !updating && h('button', { className: 'upd-update-btn', onClick: startUpdate }, '⬇ 一键更新到 ' + d.latest),
              updating && h('div', { className: 'upd-progress' }, updateLog),
              d.timeline && d.timeline.length > 0 && h('div', { className: 'upd-section' },
                h('div', { className: 'upd-section-title' }, '🕐 版本时间线（最近 ' + d.timeline.length + ' 个）'),
                d.timeline.map((t) => h('div', {
                  key: t.version,
                  className: 'upd-tl-item',
                  'data-current': String(d.local === t.version),
                },
                  h('span', { className: 'ver' }, t.version + (d.local === t.version ? ' ← 当前' : '')),
                  h('span', { className: 'time' }, fmtDate(t.time))
                ))
              ),
              d.history && d.history.length > 0 && h('div', { className: 'upd-section' },
                h('div', { className: 'upd-section-title' }, '📜 检查历史（最近 ' + d.history.length + ' 次）'),
                d.history.map((x, i) => h('div', { key: i, className: 'upd-hist-item' },
                  h('span', null, fmtTime(x.at) + (x.hasUpdate ? ' ⬆' : ' ✓')),
                  h('span', null, (x.local || '?') + ' → ' + (x.latest || '?'))
                ))
              ),
              h('div', { className: 'upd-foot' }, '自动检查间隔 6 小时 · 检查时间 ' + fmtTime(d.checkedAt))
            ),
      h('div', { style: { marginTop: 10, textAlign: 'center' } },
        h('button', {
          className: 'upd-btn',
          onClick: doCheck,
          disabled: busy || updating,
          style: { border: '1px solid var(--dsw-alias-border-l1, rgba(128,128,128,0.4))', padding: '3px 12px' },
        }, busy ? '检查中…' : '重新检查'))
    )
  }

  /** 设置页：完整界面（复用 PanelBody + 自动检查逻辑） */
  function UpdateSection() {
    const [state, setState] = useState({ phase: 'idle', data: null })
    const [updating, setUpdating] = useState(false)
    const [updateLog, setUpdateLog] = useState('')
    const [notified, setNotified] = useState(false)
    const lastLocal = useRef(null)

    const doCheck = () => {
      if (state.phase === 'busy') return
      setState({ phase: 'busy', data: null })
      return fetch('/dsh-update-check', { headers: { accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
        .then((data) => {
          setState({ phase: 'done', data })
          if (data.hasUpdate && typeof Notification !== 'undefined' && Notification.permission === 'granted' && !notified) {
            try {
              new Notification('DSH 有更新！', { body: '最新版本 ' + data.latest + '（当前 ' + data.local + '）' })
              setNotified(true)
            } catch (e) { /* ignore */ }
          }
          lastLocal.current = data.local
          return data
        })
        .catch(() => setState({ phase: 'error', data: null }))
    }

    // 打开设置页时检查一次 + 每 6 小时轮询
    useEffect(() => {
      let alive = true
      const run = () => { if (alive) doCheck().catch(() => {}) }
      const t1 = setTimeout(run, 300)
      const timer = setInterval(run, AUTO_CHECK_MS)
      return () => {
        alive = false
        clearTimeout(t1)
        clearInterval(timer)
      }
    }, [])

    const startUpdate = () => {
      if (updating) return
      setUpdating(true)
      setUpdateLog('正在执行更新（npx 拉取最新版）…\n')
      fetch('/dsh-update-check/update', { method: 'POST' })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
        .then((body) => {
          if (body.error) {
            setUpdateLog((s) => s + '错误: ' + body.error + '\n')
            setUpdating(false)
            return
          }
          pollStatus()
        })
        .catch((e) => {
          setUpdateLog((s) => s + '启动失败: ' + e.message + '\n')
          setUpdating(false)
        })
    }

    const pollStatus = () => {
      fetch('/dsh-update-check/status', { headers: { accept: 'application/json' } })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
        .then((st) => {
          if (st.output) setUpdateLog(st.output)
          if (st.running) {
            setTimeout(pollStatus, 1200)
          } else {
            setUpdateLog((s) => s + (st.exitCode === 0 ? '\n✅ 更新完成！请重启 dsh web 生效。' : '\n⚠ 更新进程退出码: ' + st.exitCode))
            setUpdating(false)
            doCheck().catch(() => {})
          }
        })
        .catch((e) => {
          setUpdateLog((s) => s + '轮询失败: ' + e.message + '\n')
          setUpdating(false)
        })
    }

    const d = state.data
    const badgeNew = d && d.hasUpdate
    const badgeErr = state.phase === 'error'
    const busy = state.phase === 'busy'

    return h('div', { style: { maxWidth: 560 } },
      h('h3', { style: { margin: '0 0 4px', fontSize: 15 } }, '🔍 DeepSeek Harness 更新检查'),
      h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary,#888)', marginBottom: 12 } },
        '自动检查 DSH 是否有新版本，支持一键更新。'),
      h(PanelBody, { state, busy, badgeErr, badgeNew, updating, updateLog, startUpdate, doCheck })
    )
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-update-check',
    order: 200,
    label: '更新检查',
  }, (props) => h(UpdateSection, props)))
}

return module.exports; } });
